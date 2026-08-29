import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import crypto from "crypto";
import { sendForgotPasswordEmail } from "@/lib/mailer";

// Human-friendly but cryptographically random reset code.
// Avoids lookalike characters; ~47 bits of entropy.
const ALPHABET = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function generateResetCode(length = 8) {
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (const b of bytes) {
    out += ALPHABET[b % ALPHABET.length];
  }
  return out;
}

// Only a SHA-256 hash of the code is persisted, so a database leak
// cannot reveal usable reset codes.
function hashCode(code) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export async function POST(request) {
  await dbConnect();

  try {
    const { email } = await request.json();

    // Type-check before the Mongo query: a JSON body like
    // {"email":{"$ne":null}} must never reach findOne as an operator object.
    if (
      typeof email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return new Response(
        JSON.stringify({ message: "ایمیل نامعتبر است." }),
        { status: 400 }
      );
    }

    const user = await User.findOne({ email });

    if (!user) {
      return new Response(
        JSON.stringify({
          message: "اگر این ایمیل ثبت‌شده باشد، لینک بازنشانی ارسال خواهد شد.",
        }),
        { status: 200 }
      );
    }

    const resetToken = generateResetCode();
    user.resetPasswordToken = hashCode(resetToken);
    user.resetPasswordExpires = Date.now() + 600000; // 10 minutes

    await user.save();

    // Send the raw code to the user - never the stored hash
    await sendForgotPasswordEmail(user.email, resetToken);

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
