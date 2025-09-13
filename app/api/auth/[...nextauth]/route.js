// فایل: app/api/auth/[...nextauth]/route.js
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import bcrypt from "bcrypt";
import { sendVerificationEmail } from "@/lib/mailer";
import otpGenerator from "otp-generator";

const generateOTP = () =>
  otpGenerator.generate(6, {
    digits: true,
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false,
  });

export const authOptions = {
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        personnelNumber: { label: "شماره پرسنلی", type: "text" },
        password: { label: "رمز عبور", type: "password" },
      },
      async authorize(credentials) {
        await dbConnect();

        if (!credentials?.personnelNumber || !credentials?.password) {
          return null;
        }

        const user = await User.findOne({
          personnelNumber: credentials.personnelNumber,
        });

        if (!user) {
          return null;
        }
        if (user.status === "PENDING") {
          const otp = generateOTP();
          user.otp = otp;
          user.otpExpires = Date.now() + 10 * 60 * 1000; // OTP expires in 10 minutes
          await user.save();
          await sendVerificationEmail(user.email, otp);

          // This special error message will be sent to the login page's URL query.
          // Your login page can then read this and redirect the user.
          // Format: "ERROR_CODE,user_email"
          throw new Error(`PENDING_VERIFICATION,${user.email}`);
        }

        if (user.status === "REJECTED") {
          throw new Error("حساب کاربری شما توسط مدیر رد شده است.");
        }
        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user._id.toString(),
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          role: user.role || "USER", // Make sure you have a role field in your User model
          profileImage: user.profileImage,
          position: user.position,
          status: user.status, // Include status
        };
      },
    }),
  ],
  callbacks: {
    // برای اضافه کردن role به توکن
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.status = user.status;
        token.position = user.position; // <-- این خط را اضافه کنید
      }
      return token;
    },
    // برای اضافه کردن role به session
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.status = token.status;
        session.user.position = token.position; // <-- این خط را اضافه کنید
      }
      return session;
    },
  },
  pages: {
    signIn: "/login", // صفحه ورود سفارشی
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
