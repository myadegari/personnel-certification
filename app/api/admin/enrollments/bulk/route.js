import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Enrollment from "@/models/Enrollment";
import User from "@/models/User";
import Course from "@/models/Course";
import { processCertificateGeneration } from "@/lib/certificateService";
import { requireAdmin } from "@/lib/authGuard";
import { recordAuditEvent, AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from "@/lib/audit";

// POST /api/admin/enrollments/bulk
// Bulk-approve or bulk-reject enrollments. Terminal enrollments (already
// APPROVED/REJECTED) are skipped to preserve immutability, and the summary
// reports how many were updated vs. skipped.
export async function POST(request) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { ids, status } = body || {};
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "لیست شناسه‌ها خالی است." }, { status: 400 });
  }
  if (status !== "APPROVED" && status !== "REJECTED") {
    return NextResponse.json({ error: "وضعیت نامعتبر است." }, { status: 400 });
  }

  await dbConnect();

  let updated = 0;
  const skipped = [];
  const errors = [];

  for (const rawId of ids) {
    const id = String(rawId);
    try {
      const enrollment = await Enrollment.findById(id);
      if (!enrollment) {
        skipped.push({ id, reason: "not_found" });
        continue;
      }

      // Immutability: terminal enrollments cannot be changed again.
      if (
        (enrollment.status === "APPROVED" ||
          enrollment.status === "REJECTED") &&
        enrollment.status !== status
      ) {
        skipped.push({ id, reason: "terminal" });
        continue;
      }
      if (enrollment.status === status) {
        // Already in the target state — nothing to do.
        continue;
      }

      const previousState = {
        status: enrollment.status,
        jobId: enrollment.jobId,
        issuedAt: enrollment.issuedAt,
        certificateUniqueId: enrollment.certificateUniqueId,
        certificateUrl: enrollment.certificateUrl,
        certificateStatus: enrollment.certificateStatus,
      };

      if (status === "APPROVED") {
        const user = await User.findById(enrollment.user).lean();
        const course = await Course.findById(enrollment.course)
          .populate("signatory signatory2")
          .lean();

        if (!course || !user) {
          skipped.push({ id, reason: "missing_course_or_user" });
          continue;
        }

        const certificateData = await processCertificateGeneration({
          enrollment,
          user,
          course,
        });

        enrollment.jobId = certificateData.jobId;
        enrollment.issuedAt = certificateData.issuedAt;
        enrollment.certificateUniqueId = certificateData.certificateUniqueId;
        enrollment.certificateUrl = certificateData.certificateUrl;
        enrollment.certificateStatus = "pending";
      }

      enrollment.status = status;
      try {
        await enrollment.save();
      } catch (saveError) {
        // Restore the pre-request state so no certificate number / queued
        // worker job is orphaned by a failed persist.
        Object.assign(enrollment, previousState);
        await enrollment.save().catch(() => {});
        throw saveError;
      }
      updated += 1;
    } catch (err) {
      errors.push({ id, reason: err.message || "unknown" });
    }
  }

  const summary = {
    updated,
    skippedCount: skipped.length,
    errorCount: errors.length,
    skipped,
    errors,
  };

  await recordAuditEvent({
    request,
    session,
    action: AUDIT_ACTIONS.ENROLLMENT_BULK,
    resourceType: AUDIT_RESOURCE_TYPES.ENROLLMENT,
    metadata: {
      status,
      updated,
      skippedCount: skipped.length,
      errorCount: errors.length,
      ids: ids.slice(0, 100),
    },
  });

  if (updated > 0 && skipped.length === 0 && errors.length === 0) {
    return NextResponse.json(summary, { status: 200 });
  }
  return NextResponse.json(summary, { status: 207 });
}
