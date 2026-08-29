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

  if (enrollment.jobId && rankOf(status) < rankOf("completed")) {
    const doc = await mongoose.connection
      .collection("job_statuses")
      .findOne({ job_id: enrollment.jobId });

    if (doc && rankOf(doc.status) > rankOf(status)) {
      status = doc.status;
      if (doc.file_id) fileId = doc.file_id;
      // Persist the recovered status so the webhook and fallback converge.
      enrollment.certificateStatus = status;
      if (doc.file_id) enrollment.certificateFileId = doc.file_id;
      await enrollment.save();
    }
  }

  return { status, fileId };
}
