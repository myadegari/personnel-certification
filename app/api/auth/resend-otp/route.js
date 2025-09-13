import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { sendVerificationEmail } from "@/lib/mailer";
import otpGenerator from "otp-generator";

const generateOTP = () =>
  otpGenerator.generate(6, {
    digits: true,
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false,
  });

export async function POST(request) {
  await dbConnect();

  try {
    const { email } = await request.json();
    if (!email) {
      return new Response(JSON.stringify({ message: "ایمیل الزامی است." }), {
        status: 400,
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return new Response(
        JSON.stringify({ message: "کاربری با این ایمیل یافت نشد." }),
        { status: 404 }
      );
    }

    if (user.status !== "NEED_TO_VERIFY") {
      return new Response(
        JSON.stringify({ message: "این حساب قبلاً تایید شده است." }),
        { status: 400 }
      );
    }

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    await sendVerificationEmail(email, otp);

    return new Response(
      JSON.stringify({ message: "کد تایید جدید ارسال شد." }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Resend OTP Error:", error);
    return new Response(JSON.stringify({ message: "خطایی در سرور رخ داد." }), {
      status: 500,
    });
  }
}
