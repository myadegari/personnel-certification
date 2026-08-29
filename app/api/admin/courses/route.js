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
];

/** Find an unused 5-digit numeric course code. */
async function generateUniqueCourseCode() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const code = String(Math.floor(10000 + Math.random() * 90000));
    const exists = await Course.exists({ courseCode: code });
    if (!exists) return code;
  }
  throw new Error("Could not allocate a unique course code");
}

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

    // The course code is a server-generated unique 5-digit number used to
    // build certificate numbers; retry once on a rare duplicate race.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      data.courseCode = await generateUniqueCourseCode();
      try {
        const newCourse = await Course.create(data);
        return NextResponse.json(newCourse, { status: 201 });
      } catch (err) {
        if (err?.code === 11000 && String(err.keyValue?.courseCode || "") === data.courseCode) {
          continue;
        }
        throw err;
      }
    }
    return NextResponse.json({ error: "Failed to allocate a unique course code" }, { status: 500 });
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
