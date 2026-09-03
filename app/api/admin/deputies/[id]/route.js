import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import Deputy from "@/models/Deputy";
import Course from "@/models/Course";
import User from "@/models/User";
import { requireAdmin } from "@/lib/authGuard";
import { sanitizeUnits, MAX_DEPUTY_UNITS } from "@/lib/organizingUnits";
import { recordAuditEvent, AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from "@/lib/audit";

// PUT: Rename a deputy and/or edit its units (its number is immutable —
// certificate numbers embed it)
export async function PUT(request, { params }) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "نام معاونت الزامی است." }, { status: 400 });
    }

    const update = { name };
    // Units are only touched when the request explicitly carries them, so a
    // rename-only PUT can never wipe the units list.
    if ("units" in body) {
      const units = sanitizeUnits(body.units, { max: MAX_DEPUTY_UNITS });
      if (units === null) {
        return NextResponse.json({ error: "فهرست واحدها نامعتبر است." }, { status: 400 });
      }
      update.units = units;
    }

    await dbConnect();
    const updated = await Deputy.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    if (!updated) {
      return NextResponse.json({ error: "معاونت یافت نشد." }, { status: 404 });
    }

    await recordAuditEvent({
      request,
      session,
      action: AUDIT_ACTIONS.DEPUTY_UPDATE,
      resourceType: AUDIT_RESOURCE_TYPES.DEPUTY,
      resourceId: updated._id,
      metadata: { deputyName: updated.name, deputyNumber: updated.number, units: updated.units },
    });

    return NextResponse.json(updated);
  } catch (err) {
    if (err?.code === 11000) {
      return NextResponse.json({ error: "معاونتی با این نام از قبل وجود دارد." }, { status: 409 });
    }
    console.error("Error updating deputy:", err);
    return NextResponse.json({ error: "خطا در ویرایش معاونت" }, { status: 500 });
  }
}

// DELETE: Remove a deputy. Blocked while any course or user still references
// it so embedded certificate numbers keep pointing at a real deputy.
export async function DELETE(request, { params }) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "معاونت یافت نشد." }, { status: 404 });
    }

    await dbConnect();

    const [courseCount, userCount] = await Promise.all([
      Course.countDocuments({ deputy: id }),
      User.countDocuments({ deputy: id }),
    ]);
    if (courseCount > 0 || userCount > 0) {
      return NextResponse.json(
        { error: `این معاونت قابل حذف نیست: ${courseCount} دوره و ${userCount} کاربر به آن ارجاع دارند.` },
        { status: 409 }
      );
    }

    const deleted = await Deputy.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ error: "معاونت یافت نشد." }, { status: 404 });
    }

    await recordAuditEvent({
      request,
      session,
      action: AUDIT_ACTIONS.DEPUTY_DELETE,
      resourceType: AUDIT_RESOURCE_TYPES.DEPUTY,
      resourceId: deleted._id,
      metadata: { deputyName: deleted.name, deputyNumber: deleted.number },
    });

    return NextResponse.json({ message: "معاونت حذف شد." });
  } catch (err) {
    console.error("Error deleting deputy:", err);
    return NextResponse.json({ error: "خطا در حذف معاونت" }, { status: 500 });
  }
}
