import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Course from "@/models/Course";

// GET: Fetch all courses
export async function GET(request) {
  try {
    await dbConnect();
    const courses = await Course.find({})
      .populate("signatory", "firstName lastName")
      .sort({ createdAt: -1 });
    return NextResponse.json(courses);
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST: Create a new course
export async function POST(request) {
  try {
    const body = await request.json();
    // console.log("Request body:", body); // Debug log
    await dbConnect();
    const newCourse = await Course.create(body);
    return NextResponse.json(newCourse, { status: 201 });
  } catch (error) {
    console.error("Error creating course:", error); // Log the error for debugging
    return NextResponse.json(
      { error: "Failed to create course" },
      { status: 500 }
    );
  }
}
