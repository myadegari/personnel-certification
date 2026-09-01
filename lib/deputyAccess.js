import { NextResponse } from "next/server";
import User from "@/models/User";
import Deputy from "@/models/Deputy";
import { ROLES } from "@/lib/roles";

/**
 * Resolves the caller (must be DEPUTY_HEAD) and their headed deputy.
 * Returns { user, deputy } or { error: NextResponse }.
 */
export async function resolveDeputyHead(session) {
  if (session.user.role !== ROLES.DEPUTY_HEAD) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  const user = await User.findById(session.user.id).lean();
  if (!user?.headedDeputy) {
    return {
      error: NextResponse.json(
        { error: "برای شما معاونتی تعیین نشده است." },
        { status: 403 }
      ),
    };
  }
  const deputy = await Deputy.findById(user.headedDeputy).lean();
  if (!deputy) {
    return {
      error: NextResponse.json({ error: "معاونت شما یافت نشد." }, { status: 403 }),
    };
  }
  return { user, deputy };
}
