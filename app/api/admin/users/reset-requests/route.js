import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { requireAdmin } from "@/lib/authGuard";
import { ROLES, isSuperAdmin } from "@/lib/roles";

// Counts that power the admin sidebar badge and the users-page filter.
// Scoped the same way the user list is: normal admins only see USER accounts.
export async function GET() {
  const { session, error } = await requireAdmin();
  if (error) return error;

  try {
    await dbConnect();
    const scope = isSuperAdmin(session.user.role) ? {} : { role: ROLES.USER };

    const [requested, temp] = await Promise.all([
      User.countDocuments({ ...scope, passwordResetRequested: true }),
      User.countDocuments({ ...scope, mustChangePassword: true }),
    ]);

    return NextResponse.json({ requested, temp });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
