// File: app/api/auth/reset-password/route.js
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import bcrypt from "bcrypt";

export async function POST(request) {
  await dbConnect();

  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return new Response(JSON.stringify({ message: "اطلاعات ناقص است." }), { status: 400 });
    }

    // Find the user with a valid, non-expired token
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }, // Check if token is not expired
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
