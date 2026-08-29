import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import bcrypt from "bcrypt";
import { recordAuditEvent, AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from "@/lib/audit";

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });

  try {
    const { currentPassword, newPassword } = await request.json();

    if (
      typeof currentPassword !== "string" ||
      !currentPassword ||
      !newPassword
    ) {
      return new Response(JSON.stringify({ message: "اطلاعات ناقص است." }), { status: 400 });
    }
    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return new Response(
        JSON.stringify({ message: "رمز عبور جدید باید حداقل ۸ کاراکتر باشد." }),
        { status: 400 }
      );
    }

    await dbConnect();
    const user = await User.findById(session.user.id);
    if (!user) return new Response(JSON.stringify({ message: "User not found" }), { status: 404 });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return new Response(JSON.stringify({ message: "رمز عبور فعلی اشتباه است." }), { status: 400 });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    await recordAuditEvent({
      request,
      session,
      action: AUDIT_ACTIONS.PASSWORD_CHANGE,
      resourceType: AUDIT_RESOURCE_TYPES.USER,
      resourceId: user._id,
    });

    return new Response(JSON.stringify({ message: "رمز عبور با موفقیت تغییر کرد." }), { status: 200 });
  } catch (error) {
    console.error("Change password error:", error);
    return new Response(JSON.stringify({ message: "خطایی در سرور رخ داد." }), { status: 500 });
  }
}
