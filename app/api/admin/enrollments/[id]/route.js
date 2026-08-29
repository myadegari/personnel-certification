import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Enrollment from "@/models/Enrollment";
import User from "@/models/User";
import Course from "@/models/Course";
import { processCertificateGeneration } from "@/lib/certificateService";
import { requireAdmin } from "@/lib/authGuard";

export async function PUT(request, { params }) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { id: enrollmentId } = await params;
    const { status } = await request.json();

    await dbConnect();

    const enrollment = await Enrollment.findById(enrollmentId);
    if (!enrollment) {
      return NextResponse.json(
        { error: "Enrollment not found" },
        { status: 404 }
      );
    }

    const previousStatus = enrollment.status;
    // Snapshot for rollback if the final save fails (see below).
    const previousState = {
      status: enrollment.status,
      jobId: enrollment.jobId,
      issuedAt: enrollment.issuedAt,
      certificateUniqueId: enrollment.certificateUniqueId,
      certificateUrl: enrollment.certificateUrl,
      certificateStatus: enrollment.certificateStatus,
    };

    // Enforce immutability: once an enrollment is APPROVED or REJECTED its
    // status is final and can never be changed again (no reopening/rejecting).
    if (
      (previousStatus === "APPROVED" || previousStatus === "REJECTED") &&
      status !== previousStatus
    ) {
      return NextResponse.json(
        { error: "وضعیت نهایی شده و غیرقابل تغییر است." },
        { status: 409 }
      );
    }

    // --- Certificate Generation Logic ---
    if (status === "APPROVED" && previousStatus !== "APPROVED") {
      const user = await User.findById(enrollment.user).lean();
      const course = await Course.findById(enrollment.course)
        .populate("signatory signatory2")
        .lean();

      if (!course || !user) {
        return NextResponse.json(
          { error: "Associated course or user not found" },
          { status: 404 }
        );
      }

      // Call the external service to handle the complex logic
      const certificateData = await processCertificateGeneration({
        enrollment,
        user,
        course,
      });

      // Update enrollment with data returned from the service
      enrollment.jobId = certificateData.jobId;
      enrollment.issuedAt = certificateData.issuedAt;
      enrollment.certificateUniqueId = certificateData.certificateUniqueId;
      enrollment.certificateUrl = certificateData.certificateUrl;
      // Seed the lifecycle status; the worker's webhook (or the MongoDB
      // job_statuses fallback) advances it to processing/completed/failed.
      enrollment.certificateStatus = "pending";
    }

    enrollment.status = status;
    try {
      await enrollment.save();
    } catch (saveError) {
      // A failed save must not leave the certificate number / queued worker
      // job orphaned: restore the exact pre-request state. The consumed
      // number is intentionally NOT released (IndicatorUsage already
      // recorded it), so it becomes a permanent gap instead of a reuse hazard.
      Object.assign(enrollment, previousState);
      await enrollment.save().catch(() => {});
      throw saveError;
    }

    return NextResponse.json(enrollment);
  } catch (error) {
    console.error("Enrollment update error:", error.message);

    // Check for our specific capacity error to return a better status code
    if (error.message.includes("capacity for pattern")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to update enrollment. The operation was rolled back." },
      { status: 500 }
    );
  }
}
