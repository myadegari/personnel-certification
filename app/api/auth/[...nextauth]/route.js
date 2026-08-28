// فایل: app/api/auth/[...nextauth]/route.js
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import bcrypt from "bcrypt";

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
          throw new Error("ACCOUNT_NOT_ACTIVE");
        }

        if (user.status === "REJECTED") {
          throw new Error("ACCOUNT_REJECTED");
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
          role: user.role || "USER",
          position: user.position,
          status: user.status,
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
    signIn: "/authentication/login", // صفحه ورود سفارشی
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
