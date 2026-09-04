import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { recordAuditEvent, AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from "@/lib/audit";

// Offline "forgot password": instead of emailing an OTP, the user flags their
// account so an admin sees a badge and can issue a temporary password. This
// endpoint only sets a boolean flag — it never reveals or changes any password.
export async function POST(request) {
  await dbConnect();

  try {
    const body = await request.json().catch(() => ({}));
    const personnelNumber =
      typeof body.personnelNumber === "string" ? body.personnelNumber.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";

    if (!personnelNumber && !email) {
      return Response.json(
        { message: "شماره پرسنلی یا ایمیل را وارد کنید." },
        { status: 400 }
      );
    }

    const query = personnelNumber ? { personnelNumber } : { email };
    const user = await User.findOne(query);

    // Always answer the same way so this can't be used to enumerate accounts.
    const generic = {
      message:
        "درخواست شما ثبت شد. برای دریافت رمز عبور موقت با مدیر سامانه تماس بگیرید.",
    };

    if (!user) {
      return Response.json(generic, { status: 200 });
    }

    if (!user.passwordResetRequested) {
      user.passwordResetRequested = true;
      user.passwordResetRequestedAt = new Date();
      await user.save();

      await recordAuditEvent({
        request,
        actor: {
          id: user._id,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role,
        },
        action: AUDIT_ACTIONS.PASSWORD_RESET_REQUEST,
        resourceType: AUDIT_RESOURCE_TYPES.USER,
        resourceId: user._id,
      });
    }

    return Response.json(generic, { status: 200 });
  } catch (error) {
    console.error("Request password reset error:", error);
    return Response.json(
      { message: "خطایی در سرور رخ داد." },
      { status: 500 }
    );
  }
}
