import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Deputy from "@/models/Deputy";
import { requireAdmin } from "@/lib/authGuard";
import { recordAuditEvent, AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from "@/lib/audit";

const MAX_DEPUTY_NUMBER = 99;

// GET: Fetch all deputies
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    await dbConnect();
    const deputies = await Deputy.find({}).sort({ number: 1 });
    return NextResponse.json(deputies);
  } catch (err) {
    console.error("Error listing deputies:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST: Create a deputy with an auto-assigned 2-digit sequence number
export async function POST(request) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "نام معاونت الزامی است." }, { status: 400 });
    }

    await dbConnect();

    const last = await Deputy.findOne().sort({ number: -1 }).lean();
    const nextNumber = (last?.number || 0) + 1;
    if (nextNumber > MAX_DEPUTY_NUMBER) {
      return NextResponse.json(
        { error: "ظرفیت شماره معاونت‌ها (تا ۹۹) تکمیل شده است." },
        { status: 400 }
      );
    }

    const deputy = await Deputy.create({ name, number: nextNumber });

    await recordAuditEvent({
      request,
      session,
      action: AUDIT_ACTIONS.DEPUTY_CREATE,
      resourceType: AUDIT_RESOURCE_TYPES.DEPUTY,
      resourceId: deputy._id,
      metadata: { deputyName: deputy.name, deputyNumber: deputy.number },
    });

    return NextResponse.json(deputy, { status: 201 });
  } catch (err) {
    if (err?.code === 11000) {
      return NextResponse.json(
        { error: "معاونتی با این نام یا شماره از قبل وجود دارد." },
        { status: 409 }
      );
    }
    if (err?.name === "ValidationError") {
      return NextResponse.json(
        { error: "داده معاونت نامعتبر است.", details: Object.values(err.errors).map((e) => e.message) },
        { status: 400 }
      );
    }
    console.error("Error creating deputy:", err);
    return NextResponse.json({ error: "خطا در ایجاد معاونت" }, { status: 500 });
  }
}
