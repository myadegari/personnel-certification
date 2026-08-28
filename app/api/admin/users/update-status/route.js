import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { sendAdminNotificationEmail } from "@/lib/mailer";
import { requireAdmin } from "@/lib/authGuard";

export async function POST(request) {
  const { error } = await requireAdmin();
  if (error) return error;

  await dbConnect();

  try {
    const { userId, status } = await request.json();

    if (!userId || !status) {
      return NextResponse.json(
        { message: "شناسه کاربر و وضعیت جدید الزامی است." },
        { status: 400 }
      );
    }

    if (!["VERIFIED", "REJECTED"].includes(status)) {
      return NextResponse.json(
        { message: "وضعیت ارسال شده نامعتبر است." },
        { status: 400 }
      );
    }

    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json({ message: "کاربر یافت نشد." }, { status: 404 });
    }

    if (user.status !== "NEED_TO_VERIFY") {
      return NextResponse.json(
        {
          message: `عملیات روی کاربر با وضعیت '${user.status}' مجاز نیست.`,
        },
        { status: 400 }
      );
    }

    // Mutate the database first...
    if (status === "VERIFIED") {
      user.status = "VERIFIED";
      await user.save();
    } else {
      // rejected
      await User.findByIdAndDelete(userId);
    }

    // ...then notify the user by email
    try {
      await sendAdminNotificationEmail(user.email, status);
    } catch (emailError) {
      console.error("Notification email failed:", emailError);
    }

    return NextResponse.json({
      message:
        status === "VERIFIED"
          ? "کاربر با موفقیت تایید شد."
          : "کاربر با موفقیت رد و حذف شد.",
    });
  } catch (err) {
    console.error("Update User Status Error:", err);
    return NextResponse.json({ message: "خطایی در سرور رخ داد." }, { status: 500 });
  }
}
