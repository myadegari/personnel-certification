// File: app/api/auth/forgot-password/route.js
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import crypto from "crypto";
// In a real app, you would use a mailer library like nodemailer
// import nodemailer from "nodemailer";

export async function POST(request) {
  await dbConnect();
  
  try {
    const { email } = await request.json();
    const user = await User.findOne({ email });

    if (!user) {
      // We send a generic success message even if the user is not found
      // to prevent email enumeration attacks.
      return new Response(JSON.stringify({ message: "اگر ایمیل شما در سیستم موجود باشد، لینک بازنشانی برایتان ارسال خواهد شد." }), { status: 200 });
    }

    // --- Generate a secure token ---
    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = resetToken;
    // Set token to expire in 1 hour
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour in milliseconds

    await user.save();

    // --- Send the email (Simulated) ---
    // In a real application, you would configure and use a mail service here.
    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${resetToken}`;

    console.log("--- PASSWORD RESET EMAIL (SIMULATED) ---");
    console.log(`To: ${user.email}`);
    console.log(`Subject: درخواست بازنشانی رمز عبور`);
    console.log(`برای بازنشانی رمز عبور خود، روی لینک زیر کلیک کنید:`);
    console.log(resetUrl);
    console.log(`کد بازنشانی شما (OTP): ${resetToken}`);
    console.log("-----------------------------------------");
    
    // For a real implementation with Nodemailer:
    // const transporter = nodemailer.createTransport({ ... });
    // await transporter.sendMail({
    //   to: user.email,
    //   subject: 'Password Reset Request',
    //   html: `Click <a href="${resetUrl}">here</a> to reset your password.`,
    // });
    
    return new Response(JSON.stringify({ message: "اگر ایمیل شما در سیستم موجود باشد، لینک بازنشانی برایتان ارسال خواهد شد." }), { status: 200 });

  } catch (error) {
    console.error("Forgot Password Error:", error);
    return new Response(JSON.stringify({ message: "خطایی در سرور رخ داد." }), { status: 500 });
  }
}
