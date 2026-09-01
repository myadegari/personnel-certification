import { NextResponse } from "next/server";
import { buildCertificateTemplateCsv } from "@/lib/csv";
import { requireVerified } from "@/lib/authGuard";
import { isStaffRole } from "@/lib/roles";
import { ROLES } from "@/lib/roles";

export async function GET() {
  const { session, error } = await requireVerified();
  if (error) return error;
  if (!isStaffRole(session.user.role) && session.user.role !== ROLES.DEPUTY_HEAD) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const csv = buildCertificateTemplateCsv();
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="certificate-import-template.csv"',
    },
  });
}