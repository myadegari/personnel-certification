import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Course from "@/models/Course";
import { requireAdmin } from "@/lib/authGuard";

// GET: Fetch all courses
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    await dbConnect();
    const courses = await Course.find({})
      .populate("signatory", "firstName lastName")
      .sort({ createdAt: -1 });
    return NextResponse.json(courses);
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

const ALLOWED_FIELDS = [
  "courseCode",
  "name",
  "date",
  "duration",
  "enrollmentDeadline",
  "enrollmentLimit",
  "organizingUnit",
  "signatory",
  "unitStamp",
  "signatory2",
  "unitStamp2",
  "certificateNumberPattern",
];

// POST: Create a new course
export async function POST(request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await request.json();

    // Whitelist fields to prevent mass assignment
    const data = {};
    for (const field of ALLOWED_FIELDS) {
      if (field in body) data[field] = body[field];
    }

    await dbConnect();
    const newCourse = await Course.create(data);
    return NextResponse.json(newCourse, { status: 201 });
  } catch (err) {
    if (err?.name === "ValidationError") {
      return NextResponse.json(
        { error: "Invalid course data", details: Object.values(err.errors).map((e) => e.message) },
        { status: 400 }
      );
    }
    console.error("Error creating course:", err);
    return NextResponse.json({ error: "Failed to create course" }, { status: 500 });
  }
}
