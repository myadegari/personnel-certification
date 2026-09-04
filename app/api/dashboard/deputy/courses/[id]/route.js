import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import Course from "@/models/Course";
import Enrollment from "@/models/Enrollment";
import GuestCertificate from "@/models/GuestCertificate";
import User from "@/models/User";
import { resolveDeputyHead } from "@/lib/deputyAccess";
import { sanitizeUnits, joinUnits, MAX_COURSE_UNITS } from "@/lib/organizingUnits";
import { requireVerified } from "@/lib/authGuard";
import { recordAuditEvent, AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from "@/lib/audit";

function toObjectIdOrNull(value) {
  const v = typeof value === "string" ? value.trim() : "";
  if (!v || !mongoose.Types.ObjectId.isValid(v)) return null;
  return v;
}

async function loadOwnCourse(id, deputyId) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  // Deputies may only touch their own private courses — never PUBLIC center
  // courses or another deputy's courses.
  return Course.findOne({ _id: id, deputy: deputyId, visibility: "DEPUTY" });
}

// PUT: edit the deputy head's own course (fields limited to content/signatories)
export async function PUT(request, { params }) {
  const { session, error } = await requireVerified();
  if (error) return error;

  try {
    const { id } = await params;
    await dbConnect();
    const access = await resolveDeputyHead(session);
    if (access.error) return access.error;

    const course = await loadOwnCourse(id, access.deputy._id);
    if (!course) {
      return NextResponse.json({ error: "دوره یافت نشد." }, { status: 404 });
    }

    const body = await request.json();
    const update = {};

    if (typeof body?.name === "string" && body.name.trim()) update.name = body.name.trim();
    if (Number.isFinite(Number(body?.date))) update.date = Number(body.date);
    if (Number.isFinite(Number(body?.duration)) && Number(body.duration) > 0) {
      update.duration = Number(body.duration);
    }
    for (const field of ["signatory", "signatory2", "unitStamp", "unitStamp2"]) {
      if (field in body) update[field] = toObjectIdOrNull(body[field]);
    }
    // Units are only touched when the request explicitly carries them; any
    // provided set must be the deputy's name and/or its own units (max 2).
    if (Array.isArray(body?.organizingUnits) && body.organizingUnits.length > 0) {
      const allowedUnits = new Set([access.deputy.name, ...(access.deputy.units || [])]);
      const requested = sanitizeUnits(body.organizingUnits, { max: MAX_COURSE_UNITS });
      if (!requested.length || requested.some((u) => !allowedUnits.has(u))) {
        return NextResponse.json(
          { error: "واحد برگزارکننده باید نام معاونت یا یکی از واحدهای آن باشد." },
          { status: 400 }
        );
      }
      update.organizingUnits = requested;
      update.organizingUnit = joinUnits(requested);
    }
    // Second signatory's units (template2), validated against signatory 2's own
    // deputy (the effective one after this request).
    if (Array.isArray(body?.organizingUnits2)) {
      const s2id = "signatory2" in body ? update.signatory2 : course.signatory2;
      const requested2 = sanitizeUnits(body.organizingUnits2, { max: MAX_COURSE_UNITS }) || [];
      if (requested2.length) {
        if (!s2id) {
          return NextResponse.json(
            { error: "برای واحد امضاکننده دوم ابتدا خود امضاکننده دوم را انتخاب کنید." },
            { status: 400 }
          );
        }
        const s2 = await User.findById(s2id).select("deputy").populate("deputy", "name units").lean();
        const allowed2 = new Set([s2?.deputy?.name, ...(s2?.deputy?.units || [])].filter(Boolean));
        if (requested2.some((u) => !allowed2.has(u))) {
          return NextResponse.json(
            { error: "واحد امضاکننده دوم باید نام معاونت او یا یکی از واحدهای آن باشد." },
            { status: 400 }
          );
        }
      }
      update.organizingUnits2 = requested2;
      update.organizingUnit2 = joinUnits(requested2);
    }
    if (update.signatory === null) {
      return NextResponse.json({ error: "امضاکننده الزامی است." }, { status: 400 });
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "فیلدی برای بروزرسانی ارسال نشده است." }, { status: 400 });
    }

    const updated = await Course.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });
    if (!updated) {
      return NextResponse.json({ error: "دوره یافت نشد." }, { status: 404 });
    }

    await recordAuditEvent({
      request,
      session,
      action: AUDIT_ACTIONS.COURSE_UPDATE,
      resourceType: AUDIT_RESOURCE_TYPES.COURSE,
      resourceId: updated._id,
      metadata: { fields: Object.keys(update), courseName: updated.name, via: "deputy" },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Deputy course update error:", err);
    return NextResponse.json({ error: "خطا در ویرایش دوره" }, { status: 500 });
  }
}

// DELETE: remove the deputy head's own course (no enrollments can exist, but
// guard issued certificates by refusing deletion once any exist).
export async function DELETE(request, { params }) {
  const { session, error } = await requireVerified();
  if (error) return error;

  try {
    const { id } = await params;
    await dbConnect();
    const access = await resolveDeputyHead(session);
    if (access.error) return access.error;

    const course = await loadOwnCourse(id, access.deputy._id);
    if (!course) {
      return NextResponse.json({ error: "دوره یافت نشد." }, { status: 404 });
    }

    const [enrollmentCount, guestCount] = await Promise.all([
      Enrollment.countDocuments({ course: id }),
      GuestCertificate.countDocuments({ course: id }),
    ]);
    if (enrollmentCount > 0 || guestCount > 0) {
      return NextResponse.json(
        { error: "این دوره دارای گواهی صادر شده است و قابل حذف نیست." },
        { status: 409 }
      );
    }

    await Course.findByIdAndDelete(id);

    await recordAuditEvent({
      request,
      session,
      action: AUDIT_ACTIONS.COURSE_DELETE,
      resourceType: AUDIT_RESOURCE_TYPES.COURSE,
      resourceId: course._id,
      metadata: { courseName: course.name, via: "deputy" },
    });

    return NextResponse.json({ message: "دوره حذف شد." });
  } catch (err) {
    console.error("Deputy course delete error:", err);
    return NextResponse.json({ error: "خطا در حذف دوره" }, { status: 500 });
  }
}
