// Removes duplicate certificate File records that share the same
// metadata.job_id + bucket (created by worker retries/redeliveries).
//
// For every duplicate group the keeper is, in order of preference:
//   1. the record an Enrollment.certificateFileId points at
//   2. the newest record
// Removed records whose S3 object is NOT shared with the keeper are deleted
// from storage as well.
//
// Usage:
//   bun scripts/dedupe-certificate-files.js --dry-run
//   bun scripts/dedupe-certificate-files.js
//
// Run this BEFORE the unique index on { "metadata.job_id": 1, bucket: 1 }
// is built (i.e. before restarting the app with the new schema).
import mongoose from "mongoose";
import File from "../models/File.js";
import Enrollment from "../models/Enrollment.js";
import { deleteObject } from "../lib/storage.js";

const dryRun = process.argv.includes("--dry-run");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function connect() {
  const url = process.env.MONGODB_URL?.trim();
  if (!url) throw new Error("MONGODB_URL is not set.");
  // autoIndex:false so the new unique index is not built before the dedupe.
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    try {
      await mongoose.connect(url, {
        bufferCommands: false,
        autoIndex: false,
        serverSelectionTimeoutMS: 3000,
      });
      return;
    } catch (err) {
      console.warn(`Database not ready (${attempt}/10): ${err.message}`);
      await sleep(3000);
    }
  }
  throw new Error("Could not connect to MongoDB.");
}

async function main() {
  await connect();

  const dupes = await File.aggregate([
    { $match: { "metadata.job_id": { $type: "string" } } },
    {
      $group: {
        _id: { job_id: "$metadata.job_id", bucket: "$bucket" },
        ids: { $push: "$_id" },
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ]);

  if (!dupes.length) {
    console.log("No duplicate File records found. Nothing to do.");
    return;
  }

  let removedRecords = 0;
  let removedObjects = 0;

  for (const group of dupes) {
    const ids = group.ids.map((id) => id.toString());
    const docs = await File.find({ _id: { $in: group.ids } }).lean();

    // 1) A record referenced by an enrollment wins.
    const referencing = await Enrollment.find({
      certificateFileId: { $in: group.ids },
    })
      .select("certificateFileId")
      .lean();
    const referencedIds = new Set(
      referencing.map((e) => e.certificateFileId?.toString()).filter(Boolean)
    );

    let keeper =
      docs.find((d) => referencedIds.has(d._id.toString())) ||
      docs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

    console.log(
      `job_id=${group._id.job_id} bucket=${group._id.bucket}: ${group.count} records, keeping ${keeper._id}${referencedIds.size ? " (enrollment-referenced)" : ""}`
    );

    for (const doc of docs) {
      if (doc._id.toString() === keeper._id.toString()) continue;
      console.log(
        `  removing ${doc._id} (objectName=${doc.objectName}${dryRun ? ", dry-run" : ""})`
      );
      if (dryRun) {
        removedRecords += 1;
        continue;
      }
      // Only delete the storage object when the keeper does not share it.
      if (doc.objectName !== keeper.objectName) {
        try {
          await deleteObject({ bucket: doc.bucket, objectName: doc.objectName });
          removedObjects += 1;
        } catch (err) {
          console.error(`  failed to delete object ${doc.objectName}: ${err.message}`);
        }
      }
      await File.findByIdAndDelete(doc._id);
      removedRecords += 1;
    }
    void ids;
  }

  console.log(
    `${dryRun ? "[DRY-RUN] " : ""}Done. Removed ${removedRecords} record(s), ${removedObjects} storage object(s).`
  );
}

main()
  .catch((err) => {
    console.error(`Dedupe failed: ${err.message || err}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
