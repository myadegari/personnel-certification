// One-off migration for the on-demand certificate model.
//
//   1. Backfill: for every already-issued Enrollment / GuestCertificate that
//      has no Certificate snapshot yet, reconstruct the render-data snapshot
//      from CURRENT course/user data and store it (best-effort).
//   2. Purge: delete every stored certificate PDF from Alarik and its `files`
//      document, and clear the now-unused certificateFileId / fileId refs.
//
// Run with:  bun scripts/remove-generated-certificates.js
// (bun loads .env automatically; MONGODB_URL + STORAGE_* must be set.)

import mongoose from "mongoose";
import Enrollment from "../models/Enrollment.js";
import GuestCertificate from "../models/GuestCertificate.js";
import Course from "../models/Course.js";
import User from "../models/User.js";
import File from "../models/File.js";
import Certificate from "../models/Certificate.js";
import { deleteObject } from "../lib/storage.js";
import { buildCertificateRenderData } from "../lib/certificateRenderData.js";

function splitName(fullName) {
  const parts = String(fullName || "").trim().split(/\s+/);
  const firstName = parts[0] || "";
  const lastName = parts.slice(1).join(" ") || parts[0] || "";
  return { firstName, lastName };
}

async function backfillEnrollments() {
  const issued = await Enrollment.find({
    certificateUniqueId: { $nin: [null, ""] },
  }).lean();
  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const e of issued) {
    const certificationId = String(e._id);
    if (await Certificate.exists({ certificationId })) {
      skipped += 1;
      continue;
    }
    try {
      const course = await Course.findById(e.course)
        .populate("signatory signatory2")
        .lean();
      const user = await User.findById(e.user).lean();
      if (!course || !user || !course.signatory) {
        failed += 1;
        console.warn(`  skip enrollment ${certificationId}: missing course/signatory`);
        continue;
      }
      const data = buildCertificateRenderData({
        user,
        course,
        certNumber: e.certificateUniqueId,
        issuedAt: e.issuedAt || "",
        certificationId,
      });
      await Certificate.create({
        certificationId,
        kind: "enrollment",
        certificateNumber: e.certificateUniqueId,
        issuedAt: e.issuedAt || "",
        data,
        status: "issued",
      });
      created += 1;
    } catch (err) {
      failed += 1;
      console.warn(`  enrollment ${certificationId} failed: ${err.message}`);
    }
  }
  return { total: issued.length, created, skipped, failed };
}

async function backfillGuests() {
  const issued = await GuestCertificate.find({
    certificateNumber: { $nin: [null, ""] },
  }).lean();
  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const g of issued) {
    const certificationId = String(g._id);
    if (await Certificate.exists({ certificationId })) {
      skipped += 1;
      continue;
    }
    try {
      const course = await Course.findById(g.course)
        .populate("signatory signatory2")
        .lean();
      if (!course || !course.signatory) {
        failed += 1;
        console.warn(`  skip guest ${certificationId}: missing course/signatory`);
        continue;
      }
      const { firstName, lastName } = splitName(g.fullName);
      const user = {
        _id: null,
        gender: g.gender,
        firstName,
        lastName,
        nationalId: g.nationalId,
      };
      const data = buildCertificateRenderData({
        user,
        course,
        certNumber: g.certificateNumber,
        issuedAt: g.issuedAt || "",
        certificationId,
      });
      await Certificate.create({
        certificationId,
        kind: "guest",
        certificateNumber: g.certificateNumber,
        issuedAt: g.issuedAt || "",
        data,
        status: "issued",
      });
      created += 1;
    } catch (err) {
      failed += 1;
      console.warn(`  guest ${certificationId} failed: ${err.message}`);
    }
  }
  return { total: issued.length, created, skipped, failed };
}

async function purgeStoredCertificates() {
  const docs = await File.find({ bucket: "certificate" }).lean();
  let deletedObjects = 0;
  let deletedDocs = 0;
  for (const f of docs) {
    try {
      await deleteObject({ bucket: f.bucket, objectName: f.objectName });
      deletedObjects += 1;
    } catch (err) {
      console.warn(`  could not delete object ${f.bucket}/${f.objectName}: ${err.message}`);
    }
    await File.deleteOne({ _id: f._id });
    deletedDocs += 1;
  }
  // Clear the now-unused file references on the records.
  await Enrollment.updateMany({}, { $set: { certificateFileId: null } });
  await GuestCertificate.updateMany({}, { $set: { fileId: null } });
  return { deletedObjects, deletedDocs };
}

async function main() {
  const url = process.env.MONGODB_URL?.trim();
  if (!url) throw new Error("MONGODB_URL is not set");
  await mongoose.connect(url, { bufferCommands: false });
  console.log("Connected. Backfilling render-data snapshots...");

  const enrollments = await backfillEnrollments();
  console.log("  enrollments:", enrollments);
  const guests = await backfillGuests();
  console.log("  guests:", guests);

  console.log("Purging stored certificate PDFs + file records...");
  const purged = await purgeStoredCertificates();
  console.log("  purged:", purged);

  console.log("Done. Certificates are now generated on demand from snapshots.");
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
