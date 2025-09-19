import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import dbConnect from "@/lib/dbConnect";
import Enrollment from "@/models/Enrollment";
import Course from "@/models/Course";


export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });
  }

  try {
    const { courseId } = await request.json();
    if (!courseId) {
      return new Response(JSON.stringify({ message: "Course ID is required" }), { status: 400 });
    }

    await dbConnect();

    // --- Validation Logic Start ---

    const course = await Course.findById(courseId);
    if (!course) {
        return new Response(JSON.stringify({ message: "Course not found" }), { status: 404 });
    }

    // 1. Check registration deadline
    if (course.registrationDeadline) {
      const now = Math.floor(Date.now() / 1000); // Current time in seconds
      if (now > course.registrationDeadline) {
        return new Response(JSON.stringify({ message: "The registration period for this course has ended" }), { status: 403 });
      }
    }

    // 2. Check enrollment limit
    if (course.enrollmentLimit && course.enrollmentLimit > 0) {
      const approvedEnrollmentsCount = await Enrollment.countDocuments({
        course: courseId,
        status: 'APPROVED',
      });

      if (approvedEnrollmentsCount >= course.enrollmentLimit) {
        return new Response(JSON.stringify({ message: "This course has reached its enrollment limit" }), { status: 403 });
      }
    }

    // --- Validation Logic End ---
    // Check if user is already enrolled
    const existingEnrollment = await Enrollment.findOne({
      user: session.user.id,
      course: courseId,
    });

    if (existingEnrollment) {
      return new Response(JSON.stringify({ message: "You are already registered for this course" }), { status: 409 });
    }

    // Create new enrollment request
    await Enrollment.create({
      user: session.user.id,
      course: courseId,
      status: 'PENDING',
      metadata:{
        courseStatus:"EXIST"
      }
    });

    return new Response(JSON.stringify({ message: "Enrollment request sent successfully" }), { status: 201 });

  } catch (error) {
    console.error("Enrollment Error:", error);
    return new Response(JSON.stringify({ message: "Server error" }), { status: 500 });
  }
}