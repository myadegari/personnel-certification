import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import ImpersonationLog from "@/models/ImpersonationLog";
import { requireSuperAdmin } from "@/lib/authGuard";

export async function GET(request) {
  const { error } = await requireSuperAdmin();
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25")));
    const skip = (page - 1) * limit;

    await dbConnect();

    const logs = await ImpersonationLog.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    const total = await ImpersonationLog.countDocuments();

    return NextResponse.json({
      logs,
      pagination: { total, pageCount: Math.ceil(total / limit), currentPage: page },
    });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
