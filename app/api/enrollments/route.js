import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import dbConnect from "@/lib/dbConnect";
import Enrollment from "@/models/Enrollment";

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