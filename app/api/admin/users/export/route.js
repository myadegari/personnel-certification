import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { requireAdmin } from "@/lib/authGuard";
import { ROLES, isSuperAdmin } from "@/lib/roles";
import { EXPORT_COLUMNS, buildWorkbook, XLSX_MIME } from "@/lib/xlsx";

export async function GET(request) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    await dbConnect();

    const filter = isSuperAdmin(session.user.role) ? {} : { role: ROLES.USER };

    const idsParam = searchParams.get("ids");
    if (idsParam) {
      const ids = idsParam.split(",").map((s) => s.trim()).filter(Boolean);
      if (ids.length) {
        filter._id = { $in: ids };
      }
    }

    const users = await User.find(filter).select("-password").sort({ createdAt: -1 }).lean();

    const rows = users.map((u) => ({
      personnelNumber: u.personnelNumber ?? "",
      firstName: u.firstName ?? "",
      lastName: u.lastName ?? "",
      nationalId: u.nationalId ?? "",
      email: u.email ?? "",
        gender: u.gender ?? "",
        role: u.role ?? "",
      status: u.status ?? "",
      createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : "",
    }));

    const buf = Buffer.from(await buildWorkbook({ columns: EXPORT_COLUMNS, rows }));
    const filename = `users-${new Date().toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": XLSX_MIME,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to export users" }, { status: 500 });
  }
}
