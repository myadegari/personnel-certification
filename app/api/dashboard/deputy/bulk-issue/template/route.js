import { NextResponse } from "next/server";
import { buildCertificateTemplateWorkbook, XLSX_MIME } from "@/lib/xlsx";
import { requireVerified } from "@/lib/authGuard";
import { isStaffRole } from "@/lib/roles";
import { ROLES } from "@/lib/roles";

export async function GET() {
  const { session, error } = await requireVerified();
  if (error) return error;
  if (!isStaffRole(session.user.role) && session.user.role !== ROLES.DEPUTY_HEAD) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const buf = Buffer.from(await buildCertificateTemplateWorkbook());
  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": XLSX_MIME,
      "Content-Disposition": 'attachment; filename="certificate-import-template.xlsx"',
    },
  });
}