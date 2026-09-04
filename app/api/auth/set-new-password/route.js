import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import bcrypt from "bcrypt";
import { recordAuditEvent, AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from "@/lib/audit";

const MIN_LENGTH = 8;

// Called by the forced set-password page after logging in with a temporary
// password. Reads the session directly (NOT requireAuth) so it stays reachable
// while mustChangePassword blocks every other guarded API.
export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return Response.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { newPassword, confirmPassword } = await request.json();

    if (typeof newPassword !== "string" || newPassword.length < MIN_LENGTH) {
      return Response.json(
        { message: `رمز عبور جدید باید حداقل ${MIN_LENGTH} کاراکتر باشد.` },
        { status: 400 }
      );
    }
    if (newPassword !== confirmPassword) {
      return Response.json(
        { message: "رمز عبور جدید و تکرار آن یکسان نیستند." },
        { status: 400 }
      );
    }

    await dbConnect();
    const user = await User.findById(session.user.id);
    if (!user) {
      return Response.json({ message: "کاربر یافت نشد." }, { status: 404 });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.mustChangePassword = false;
    user.passwordResetRequested = false;
    user.passwordResetRequestedAt = undefined;
    await user.save();

    await recordAuditEvent({
      request,
      actor: { id: user._id, name: `${user.firstName} ${user.lastName}`, role: user.role },
      action: AUDIT_ACTIONS.PASSWORD_CHANGE,
      resourceType: AUDIT_RESOURCE_TYPES.USER,
      resourceId: user._id,
    });

    return Response.json(
      { message: "رمز عبور شما با موفقیت تنظیم شد." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Set new password error:", error);
    return Response.json({ message: "خطایی در سرور رخ داد." }, { status: 500 });
  }
}
