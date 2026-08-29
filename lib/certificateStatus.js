import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";

// Lifecycle ordering used to decide whether a recovered status is "ahead" of
// the one already stored on the enrollment. completed/failed are terminal.
const RANK = { pending: 0, processing: 1, completed: 2, failed: 2 };
const rankOf = (s) => (s ? RANK[s] ?? -1 : -1);

/**
 * Resolve the current certificate status for an enrollment.
 *
 * Primary source is `enrollment.certificateStatus`, written by the worker's
 * HMAC webhook. If that is still behind (webhook missed/delayed), fall back to
 * the worker's durable `job_statuses` document in the shared MongoDB and
 * persist the recovered value so subsequent reads are consistent.
 *
 * @returns {Promise<{status: string|null, fileId: string|null}>}
 */
export async function resolveCertificateStatus(enrollment) {
  await dbConnect();

  let status = enrollment.certificateStatus || null;
  let fileId = enrollment.certificateFileId
    ? enrollment.certificateFileId.toString()
    : null;

  // 1) Durable worker status (job_statuses) when the webhook hasn't landed.
  if (enrollment.jobId && rankOf(status) < rankOf("completed")) {
    const doc = await mongoose.connection
      .collection("job_statuses")
      .findOne({ job_id: enrollment.jobId });

    if (doc && rankOf(doc.status) > rankOf(status)) {
      status = doc.status;
      if (doc.file_id) fileId = doc.file_id;
    }
  }

  // 2) If still non-terminal but a certificate file actually exists, treat it
  //    as completed. Covers legacy enrollments predating certificateStatus.
  if (rankOf(status) < rankOf("completed")) {
    const jobId = enrollment.jobId || enrollment._id?.toString();
    if (jobId) {
      const fileDoc = await mongoose.connection
        .collection("files")
        .findOne(
          { "metadata.job_id": jobId, bucket: "certificate" },
          { projection: { _id: 1 } }
        );
      if (fileDoc) {
        status = "completed";
        if (!fileId) fileId = fileDoc._id.toString();
      }
    }
  }

  // Persist the recovered status once so later reads short-circuit.
  if (status && status !== enrollment.certificateStatus) {
    enrollment.certificateStatus = status;
    if (fileId && !enrollment.certificateFileId) enrollment.certificateFileId = fileId;
    await enrollment.save();
  }

  return { status, fileId };
}
