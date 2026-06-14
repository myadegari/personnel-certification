// File: app/api/auth/reset-password/route.js
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import bcrypt from "bcrypt";
import { hashOtp, verifyOtp } from "@/lib/otp";

export async function POST(request) {
  const { rateLimit } = await import("@/lib/rateLimiter");
  if (!rateLimit(request, 5)) {
    return new Response(JSON.stringify({ message: "تعداد درخواست‌های مجاز را رد کرده‌اید. لطفاً بعداً تلاش کنید." }), { status: 429 });
  }
  await dbConnect();

  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return new Response(JSON.stringify({ message: "اطلاعات ناقص است." }), { status: 400 });
    }

    const hashedToken = hashOtp(token);
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return new Response(JSON.stringify({ message: "کد بازنشانی نامعتبر یا منقضی شده است." }), { status: 400 });
    }

    // --- Update the password ---
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    
    // --- Invalidate the token ---
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    return new Response(JSON.stringify({ message: "رمز عبور شما با موفقیت تغییر کرد. اکنون می‌توانید وارد شوید." }), { status: 200 });

  } catch (error) {
    console.error("Reset Password Error:", error);
    return new Response(JSON.stringify({ message: "خطایی در سرور رخ داد." }), { status: 500 });
  }
}
