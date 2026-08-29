import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import AuditLog from "@/models/AuditLog";
import { requireSuperAdmin } from "@/lib/authGuard";
import { AUDIT_ACTIONS } from "@/lib/audit";

export async function GET(request) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25")));
    const skip = (page - 1) * limit;

    const action = searchParams.get("action");
    const resourceType = searchParams.get("resourceType");
    const actorId = searchParams.get("actorId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const query = {};
    if (action && Object.values(AUDIT_ACTIONS).includes(action)) {
      query.action = action;
    }
    if (resourceType) query.resourceType = resourceType;
    if (actorId) query.actorId = actorId;
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }

    await dbConnect();

    const [logs, total] = await Promise.all([
      AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AuditLog.countDocuments(query),
    ]);

    return NextResponse.json({
      logs,
      actions: Object.values(AUDIT_ACTIONS),
      pagination: { total, pageCount: Math.ceil(total / limit), currentPage: page },
    });
  } catch (err) {
    console.error("Audit logs fetch error:", err?.message);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
