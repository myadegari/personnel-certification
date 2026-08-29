import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Enrollment from "@/models/Enrollment";
import { requireAuth } from "@/lib/authGuard";
import { isStaffRole } from "@/lib/roles";
import { resolveCertificateStatus } from "@/lib/certificateStatus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/enrollments/[id]/certificate-status
export async function GET(request, { params }) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  await dbConnect();

  const enrollment = await Enrollment.findById(id);
  if (!enrollment) {
    return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });
  }

  const isOwner = enrollment.user.toString() === session.user.id;
  if (!isOwner && !isStaffRole(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { status, fileId } = await resolveCertificateStatus(enrollment);
  return NextResponse.json({ status, fileId });
}
