import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { requireAdmin } from "@/lib/authGuard";
import { ROLES, isSuperAdmin } from "@/lib/roles";
import { EXPORT_COLUMNS, stringifyCsv } from "@/lib/csv";

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
      position: u.position ?? "",
      isProfessor: u.isProfessor ? "true" : "false",
      role: u.role ?? "",
      status: u.status ?? "",
      createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : "",
    }));

    const csv = stringifyCsv(rows, EXPORT_COLUMNS);
    const filename = `users-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse("" + csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to export users" }, { status: 500 });
  }
}
