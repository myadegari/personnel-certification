import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authGuard";
import { buildTemplateCsv } from "@/lib/csv";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const csv = buildTemplateCsv();
  return new NextResponse("" + csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="users-import-template.csv"`,
    },
  });
}
