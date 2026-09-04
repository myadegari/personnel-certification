import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Course from "@/models/Course";
import { generateUniqueCourseCode } from "@/lib/courseCode";
import { requireAdmin } from "@/lib/authGuard";
import { sanitizeUnits, joinUnits, MAX_COURSE_UNITS } from "@/lib/organizingUnits";
import { recordAuditEvent, AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from "@/lib/audit";

// GET: Fetch all courses
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    await dbConnect();
    const courses = await Course.find({})
      .populate({
        path: "signatory",
        select: "firstName lastName deputy",
        populate: { path: "deputy", select: "name units" },
      })
      .populate({
        path: "signatory2",
        select: "firstName lastName deputy",
        populate: { path: "deputy", select: "name units" },
      })
      .populate("deputy", "name number units")
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
  "organizingUnits",
  "organizingUnit2",
  "organizingUnits2",
  "deputy",
  "signatory",
  "unitStamp",
  "signatory2",
  "unitStamp2",
];

// POST: Create a new course
export async function POST(request) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await request.json();

    // Whitelist fields to prevent mass assignment
    const data = {};
    for (const field of ALLOWED_FIELDS) {
      if (field in body) data[field] = body[field];
    }
    if (data.deputy === '') data.deputy = null;

    // When a structured units array is provided, it wins: sanitize (max 2)
    // and recompute the joined display string so the two never diverge.
    if (Array.isArray(data.organizingUnits)) {
      const units = sanitizeUnits(data.organizingUnits, { max: MAX_COURSE_UNITS }) || [];
      data.organizingUnits = units;
      if (units.length) data.organizingUnit = joinUnits(units);
    }

    // Second signatory's units (template2): always recompute the joined string
    // so clearing the selection also clears organizingUnit2.
    if (Array.isArray(data.organizingUnits2)) {
      const units2 = sanitizeUnits(data.organizingUnits2, { max: MAX_COURSE_UNITS }) || [];
      data.organizingUnits2 = units2;
      data.organizingUnit2 = joinUnits(units2);
    }

    await dbConnect();

    // The course code is a server-generated unique 5-digit number used to
    // build certificate numbers; retry once on a rare duplicate race.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      data.courseCode = await generateUniqueCourseCode();
      try {
        const newCourse = await Course.create(data);
        await recordAuditEvent({
          request,
          session,
          action: AUDIT_ACTIONS.COURSE_CREATE,
          resourceType: AUDIT_RESOURCE_TYPES.COURSE,
          resourceId: newCourse._id,
          metadata: { courseName: newCourse.name, courseCode: newCourse.courseCode },
        });
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
