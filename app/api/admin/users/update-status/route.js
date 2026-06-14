import { getServerSession } from "next-auth";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { sendAdminNotificationEmail } from "@/lib/mailer";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.user?.role)) {
    return new Response(JSON.stringify({ message: "دسترسی غیرمجاز" }), { status: 403 });
  }
  await dbConnect();

  try {
    const { userId, status } = await request.json();

    if (!userId || !status) {
      return new Response(
        JSON.stringify({ message: "شناسه کاربر و وضعیت جدید الزامی است." }),
        { status: 400 }
      );
    }

    if (!["VERIFIED", "REJECTED"].includes(status)) {
      return new Response(
        JSON.stringify({ message: "وضعیت ارسال شده نامعتبر است." }),
        { status: 400 }
      );
    }

    const user = await User.findById(userId);

    if (!user) {
      return new Response(JSON.stringify({ message: "کاربر یافت نشد." }), {
        status: 404,
      });
    }

    if (user.status !== "NEED_TO_VERIFY") {
      return new Response(
        JSON.stringify({
          message: `عملیات روی کاربر با وضعیت '${user.status}' مجاز نیست.`,
        }),
        { status: 400 }
      );
    }

    // Send email notification before changing the database
    await sendAdminNotificationEmail(user.email, status);

    if (status === "VERIFIED") {
      user.status = "VERIFIED";
      await user.save();
      return new Response(
        JSON.stringify({ message: "کاربر با موفقیت تایید شد." }),
        { status: 200 }
      );
    } else {
      // rejected
      await User.findByIdAndDelete(userId);
      return new Response(
        JSON.stringify({ message: "کاربر با موفقیت رد و حذف شد." }),
        { status: 200 }
      );
    }
  } catch (error) {
    console.error("Update User Status Error:", error);
    return new Response(JSON.stringify({ message: "خطایی در سرور رخ داد." }), {
      status: 500,
    });
  }
}
