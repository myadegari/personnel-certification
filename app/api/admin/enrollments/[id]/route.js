import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Enrollment from "@/models/Enrollment";
import User from "@/models/User";
import Course from "@/models/Course";
import { processCertificateGeneration } from "@/lib/certificateService"; // <-- Import our new function

export async function PUT(request, { params }) {
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
    }

    enrollment.status = status;
    const updatedEnrollment = await enrollment.save();

    return NextResponse.json(updatedEnrollment);
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
