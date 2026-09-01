import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import Course from "@/models/Course";
import User from "@/models/User";
import { generateUniqueCourseCode } from "@/lib/courseCode";
import { resolveDeputyHead } from "@/lib/deputyAccess";
import { requireVerified } from "@/lib/authGuard";
import { recordAuditEvent, AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from "@/lib/audit";

function toObjectIdOrNull(value) {
  const v = typeof value === "string" ? value.trim() : "";
  if (!v || !mongoose.Types.ObjectId.isValid(v)) return null;
  return v;
}

// GET: list the deputy head's own courses (private DEPUTY-visibility only)
export async function GET(request, { params }) {
  const { session, error } = await requireVerified();
  if (error) return error;

  try {
    await dbConnect();
    const access = await resolveDeputyHead(session);
    if (access.error) return access.error;

    const courses = await Course.find({
      deputy: access.deputy._id,
      visibility: "DEPUTY",
    })
      .populate("signatory", "firstName lastName position")
      .populate("signatory2", "firstName lastName position")
      .sort({ date: -1 })
      .lean();

    return NextResponse.json(courses);
  } catch (err) {
    console.error("Deputy courses list error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST: create a private course owned by the caller's deputy.
// deputy/visibility/organizingUnit are forced server-side; the deputy head
// can never create a PUBLIC course or touch another deputy.
export async function POST(request) {
  const { session, error } = await requireVerified();
  if (error) return error;

  try {
    await dbConnect();
    const access = await resolveDeputyHead(session);
    if (access.error) return access.error;
    const { deputy } = access;

    const body = await request.json();

    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const date = Number(body?.date);
    const duration = Number(body?.duration);
    if (!name || !Number.isFinite(date) || !Number.isFinite(duration) || duration <= 0) {
      return NextResponse.json(
        { error: "نام، تاریخ و مدت زمان دوره الزامی است." },
        { status: 400 }
      );
    }

    // Signatory defaults to the deputy head themself (mirrors the form's
    // default); still validated below against a real user.
    const signatory = toObjectIdOrNull(body?.signatory) || String(session.user.id);
    const signatoryUser = await User.findById(signatory).select("_id").lean();
    if (!signatoryUser) {
      return NextResponse.json({ error: "امضاکننده یافت نشد." }, { status: 400 });
    }

    const data = {
      name,
      date,
      duration,
      signatory,
      signatory2: toObjectIdOrNull(body?.signatory2),
      unitStamp: toObjectIdOrNull(body?.unitStamp),
      unitStamp2: toObjectIdOrNull(body?.unitStamp2),
      deputy: deputy._id,
      organizingUnit: deputy.name,
      visibility: "DEPUTY",
    };
    if (Number.isFinite(Number(body?.enrollmentDeadline))) {
      data.enrollmentDeadline = Number(body.enrollmentDeadline);
    }

    // The course code is a server-generated unique 5-digit number; retry on
    // a rare duplicate race.
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
          metadata: {
            courseName: newCourse.name,
            courseCode: newCourse.courseCode,
            via: "deputy",
          },
        });
        return NextResponse.json(newCourse, { status: 201 });
      } catch (err) {
        if (err?.code === 11000 && String(err.keyValue?.courseCode || "") === data.courseCode) {
          continue;
        }
        throw err;
      }
    }
    return NextResponse.json({ error: "خطا در تخصیص کد دوره" }, { status: 500 });
  } catch (err) {
    if (err?.name === "ValidationError") {
      return NextResponse.json(
        { error: "داده دوره نامعتبر است.", details: Object.values(err.errors).map((e) => e.message) },
        { status: 400 }
      );
    }
    console.error("Deputy course create error:", err);
    return NextResponse.json({ error: "خطا در ایجاد دوره" }, { status: 500 });
  }
}
