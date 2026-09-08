import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authGuard";
import { buildTemplateWorkbook, XLSX_MIME } from "@/lib/xlsx";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const buf = Buffer.from(await buildTemplateWorkbook());
  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": XLSX_MIME,
      "Content-Disposition": `attachment; filename="users-import-template.xlsx"`,
    },
  });
}
