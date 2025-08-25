import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
// import crypto from "crypto";
import otpGenerator from 'otp-generator';
import nodemailer from "nodemailer"; // Import nodemailer

export async function POST(request) {
  await dbConnect();
  
  try {
    const { email } = await request.json();
    const user = await User.findOne({ email });

    if (!user) {
      return new Response(JSON.stringify({ message: "اگر این ایمیل ثبت‌شده باشد، لینک بازنشانی ارسال خواهد شد." }), { status: 200 });
    }

    
    // --- NEW: Generate a secure 6-digit OTP ---
    const resetToken = otpGenerator.generate(6, { 
      digits: true, 
      lowerCaseAlphabets: true, 
      upperCaseAlphabets: false, 
      specialChars: false 
    });

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 600000; // 10 minutes

    await user.save();

    // --- NODEMAILER IMPLEMENTATION ---
    const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${resetToken}`;

    // 1. Create a transporter object using Gmail SMTP
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_EMAIL,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    // 2. Define the email options
    const mailOptions = {
      from: `"سامانه کارمندان" <${process.env.GMAIL_EMAIL}>`,
      to: user.email,
      subject: 'درخواست بازنشانی رمز عبور',
      html: `
        <h1>درخواست بازنشانی رمز عبور</h1>
        <p>شما درخواست بازنشانی رمز عبور داده‌اید. لطفاً از توکن زیر برای بازنشانی رمز عبور خود استفاده کنید:</p>
        <h2>${resetToken}</h2>
        <p>این توکن در 10 دقیقه منقضی خواهد شد.</p>
      `,
    };

    // 3. Send the email
    await transporter.sendMail(mailOptions);
    
    return new Response(JSON.stringify({ message: "اگر این ایمیل ثبت شده باشد، یک لینک بازنشانی ارسال خواهد شد." }), { status: 200 });

  } catch (error) {
    console.error("Forgot Password Error:", error);
    return new Response(JSON.stringify({ message: "خطا در ارسال ایمیل." }), { status: 500 });
  }
}