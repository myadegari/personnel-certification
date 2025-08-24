// File: app/api/auth/register/route.js
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import bcrypt from "bcrypt";

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
      email 
    } = body;

    // --- Input Validation ---
    if (!personnelNumber || !password || !firstName || !lastName || !nationalId || !email) {
      return new Response(JSON.stringify({ message: "لطفاً تمام فیلدهای الزامی را پر کنید." }), { status: 400 });
    }

    // --- Check for existing users ---
    // Check if a user with the same personnel number, national ID, or email already exists
    const existingUser = await User.findOne({
      $or: [{ personnelNumber }, { nationalId }, { email }],
    });

    if (existingUser) {
      let errorMessage = "امکان ثبت‌نام وجود ندارد. ";
      if (existingUser.personnelNumber === personnelNumber) {
        errorMessage += "شماره پرسنلی تکراری است.";
      } else if (existingUser.nationalId === nationalId) {
        errorMessage += "کد ملی تکراری است.";
      } else {
        errorMessage += "ایمیل تکراری است.";
      }
      return new Response(JSON.stringify({ message: errorMessage }), { status: 409 }); // 409 Conflict
    }

    // --- Password Hashing ---
    // Hash the user's password for security before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    // --- Create New User ---
    // Create a new user instance with the hashed password
    const newUser = new User({
      personnelNumber,
      password: hashedPassword,
      firstName,
      lastName,
      nationalId,
      email,
      // Optional fields like profileImage and signatureImage can be added later
    });

    // Save the new user to the database
    await newUser.save();

    // Return a success response
    return new Response(JSON.stringify({ message: "ثبت‌نام با موفقیت انجام شد. اکنون می‌توانید وارد شوید." }), { status: 201 });

  } catch (error) {
    // Handle any unexpected errors during the process
    console.error("Registration Error:", error);
    return new Response(JSON.stringify({ message: "خطایی در سرور رخ داد. لطفاً بعداً تلاش کنید." }), { status: 500 });
  }
}
