// File: app/api/auth/register/route.js
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import bcrypt from "bcrypt";
import otpGenerator from "otp-generator";
import { sendVerificationEmail } from "@/lib/mailer";

const generateOTP = () =>
  otpGenerator.generate(6, {
    digits: true,
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false,
  });

export async function POST(request) {
  // Establish a connection to the database
  await dbConnect();

  try {
    const body = await request.json();
    const {
      personnelNumber,
      password,
      firstName,
      lastName,
      nationalId,
      email,
      gender,
      position,
      isProfessor,
    } = body;

    // --- Input Validation ---
    if (
      !personnelNumber ||
      !password ||
      !firstName ||
      !lastName ||
      !nationalId ||
      !email ||
      !gender ||
      !position ||
      !isProfessor
    ) {
      return new Response(
        JSON.stringify({ message: "لطفاً تمام فیلدهای الزامی را پر کنید." }),
        { status: 400 }
      );
    }

    // --- Check for existing users ---
    // Check if a user with the same personnel number, national ID, or email already exists
    const existingUser = await User.findOne({
      $or: [{ personnelNumber }, { nationalId }, { email }],
    });

    if (existingUser) {
      if (existingUser.status === "pending") {
        const otp = generateOTP();
        existingUser.otp = otp;
        existingUser.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
        await existingUser.save();
        await sendVerificationEmail(existingUser.email, otp);

        return new Response(
          JSON.stringify({
            message:
              "این کاربر قبلاً مراحل اولیه ثبت‌نام را طی کرده است. کد تایید جدیدی به ایمیل شما ارسال شد.",
            showOtpStep: true,
            email: existingUser.email,
          }),
          { status: 200 }
        );
      }
      let errorMessage = "امکان ثبت‌نام وجود ندارد. ";
      if (existingUser.personnelNumber === personnelNumber) {
        errorMessage += "شماره پرسنلی تکراری است.";
      } else if (existingUser.nationalId === nationalId) {
        errorMessage += "کد ملی تکراری است.";
      } else {
        errorMessage += "ایمیل تکراری است.";
      }
      return new Response(JSON.stringify({ message: errorMessage }), {
        status: 409,
      }); // 409 Conflict
    }

    // --- Password Hashing ---
    // Hash the user's password for security before saving
    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOTP();
    // --- Create New User ---
    // Create a new user instance with the hashed password
    const newUser = new User({
      personnelNumber,
      password: hashedPassword,
      firstName,
      lastName,
      nationalId,
      email,
      gender,
      position,
      isProfessor,
      // Optional fields like profileImage and signatureImage can be added later
      status: "PENDING",
      otp: otp,
      otpExpires: Date.now() + 10 * 60 * 1000, // 10 minutes
    });

    // Save the new user to the database
    await newUser.save();
    await sendVerificationEmail(email, otp);

    // Return a success response
    return new Response(
      JSON.stringify({
        message:
          "ثبت‌نام اولیه با موفقیت انجام شد. یک کد تایید به ایمیل شما ارسال گردید.",
        showOtpStep: true,
        email: newUser.email,
      }),
      { status: 201 }
    );
    // return new Response(JSON.stringify({ message: "ثبت‌نام با موفقیت انجام شد. اکنون می‌توانید وارد شوید." }), { status: 201 });
  } catch (error) {
    // Handle any unexpected errors during the process
    console.error("Registration Error:", error);
    return new Response(
      JSON.stringify({
        message: "خطایی در سرور رخ داد. لطفاً بعداً تلاش کنید.",
      }),
      { status: 500 }
    );
  }
}
