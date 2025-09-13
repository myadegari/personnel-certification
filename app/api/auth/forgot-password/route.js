import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
// import crypto from "crypto";
import otpGenerator from "otp-generator";
// import nodemailer from "nodemailer"; // Import nodemailer
import { sendForgetPasswordEmail } from "@/lib/mailer";

export async function POST(request) {
  await dbConnect();

  try {
    const { email } = await request.json();
    const user = await User.findOne({ email });

    if (!user) {
      return new Response(
        JSON.stringify({
          message: "اگر این ایمیل ثبت‌شده باشد، لینک بازنشانی ارسال خواهد شد.",
        }),
        { status: 200 }
      );
    }

    // --- NEW: Generate a secure 6-digit OTP ---
    const resetToken = otpGenerator.generate(6, {
      digits: true,
      lowerCaseAlphabets: true,
      upperCaseAlphabets: false,
      specialChars: false,
    });

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 600000; // 10 minutes

    await user.save();

    // 3. Send the email
    await sendForgetPasswordEmail(user.email, resetToken);

    return new Response(
      JSON.stringify({
        message: "اگر این ایمیل ثبت شده باشد، یک لینک بازنشانی ارسال خواهد شد.",
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Forgot Password Error:", error);
    return new Response(JSON.stringify({ message: "خطا در ارسال ایمیل." }), {
      status: 500,
    });
  }
}
