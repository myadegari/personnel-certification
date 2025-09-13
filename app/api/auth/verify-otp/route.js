import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";

export async function POST(request) {
  await dbConnect();

  try {
    const { email, otp } = await request.json();

    if (!email || !otp) {
      return new Response(
        JSON.stringify({ message: "ایمیل و کد تایید الزامی است." }),
        { status: 400 }
      );
    }

    const user = await User.findOne({ email, otpExpires: { $gt: Date.now() } });

    if (!user) {
      return new Response(
        JSON.stringify({ message: "کد تایید نامعتبر یا منقضی شده است." }),
        { status: 400 }
      );
    }

    if (user.otp !== otp) {
      return new Response(
        JSON.stringify({ message: "کد تایید وارد شده صحیح نیست." }),
        { status: 400 }
      );
    }

    user.status = "NEED_TO_VERIFY";
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    return new Response(
      JSON.stringify({
        message:
          "حساب کاربری شما با موفقیت تایید شد. پس از بررسی توسط مدیر، حساب شما فعال خواهد شد.",
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("OTP Verification Error:", error);
    return new Response(JSON.stringify({ message: "خطایی در سرور رخ داد." }), {
      status: 500,
    });
  }
}
