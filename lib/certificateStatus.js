import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import Certificate from "@/models/Certificate";

// Lifecycle ordering used to decide whether a recovered status is "ahead" of
// the one already stored on the enrollment. completed/failed are terminal.
const RANK = { pending: 0, processing: 1, completed: 2, failed: 2 };
const rankOf = (s) => (s ? RANK[s] ?? -1 : -1);

/**
 * Resolve the current certificate status for an enrollment.
 *
 * Certificates are now generated on demand from a stored render-data snapshot
 * (the Certificate collection), so "completed" simply means a snapshot exists.
 * The legacy worker `job_statuses` probe is kept as a harmless fallback for
 * records issued before this change.
 *
 * @returns {Promise<{status: string|null, fileId: string|null}>}
 */
export async function resolveCertificateStatus(enrollment) {
  await dbConnect();

  let status = enrollment.certificateStatus || null;

  // 1) Legacy durable worker status (job_statuses) for pre-migration records.
  if (enrollment.jobId && rankOf(status) < rankOf("completed")) {
    const doc = await mongoose.connection
      .collection("job_statuses")
      .findOne({ job_id: enrollment.jobId });
    if (doc && rankOf(doc.status) > rankOf(status)) {
      status = doc.status;
    }
  }

  // 2) A stored render-data snapshot means the certificate is available.
  if (rankOf(status) < rankOf("completed")) {
    const certificationId = enrollment._id?.toString();
    if (certificationId) {
      const exists = await Certificate.exists({ certificationId });
      if (exists) status = "completed";
    }
  }

  // Persist the recovered status once so later reads short-circuit.
  if (status && status !== enrollment.certificateStatus) {
    enrollment.certificateStatus = status;
    await enrollment.save();
  }

  return { status, fileId: null };
}
