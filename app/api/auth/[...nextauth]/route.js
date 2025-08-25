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

        const user = await User.findOne({ personnelNumber: credentials.personnelNumber });

        if (!user) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user._id.toString(),
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          role: user.role || 'USER', // Make sure you have a role field in your User model
          profileImage: user.profileImage,
          position: user.position,
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
        token.profileImage = user.profileImage; // <-- این خط را اضافه کنید
        token.position = user.position; // <-- این خط را اضافه کنید
      
      }
      return token;
    },
    // برای اضافه کردن role به session
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.profileImage = token.profileImage; // <-- این خط را اضافه کنید
        session.user.position = token.position; // <-- این خط را اضافه کنید
      }
      return session;
    },
  },
  pages: {
    signIn: '/login', // صفحه ورود سفارشی
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };