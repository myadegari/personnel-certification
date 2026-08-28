// فایل: app/api/auth/[...nextauth]/route.js
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getServerSession } from "next-auth";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import ImpersonationLog from "@/models/ImpersonationLog";
import bcrypt from "bcrypt";
import { isStaffRole, canImpersonate } from "@/lib/roles";

async function logImpersonation(entry) {
  try {
    await ImpersonationLog.create(entry);
  } catch (err) {
    console.error("Impersonation audit log failed:", err);
  }
}

export const authOptions = {
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      id: "credentials",
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
    CredentialsProvider({
      id: "impersonation",
      name: "Impersonation",
      credentials: {
        targetUserId: { label: "targetUserId", type: "text" },
      },
      async authorize(credentials) {
        const current = await getServerSession(authOptions);
        if (!current?.user || !isStaffRole(current.user.role)) return null;
        // Disallow nested impersonation.
        if (current.user.impersonatedBy) return null;

        const targetId = credentials?.targetUserId;
        if (!targetId || targetId === current.user.id) return null;

        await dbConnect();
        const target = await User.findById(targetId);
        if (!target || target.status !== "VERIFIED") return null;
        if (!canImpersonate(current.user.role, target.role)) return null;

        await logImpersonation({
          actorId: current.user.id,
          actorName: current.user.name,
          actorRole: current.user.role,
          targetId: target._id,
          targetName: `${target.firstName} ${target.lastName}`,
          targetRole: target.role,
          action: "START",
        });

        return {
          id: target._id.toString(),
          name: `${target.firstName} ${target.lastName}`,
          email: target.email,
          role: target.role || "USER",
          position: target.position,
          status: target.status,
          impersonatedBy: {
            id: current.user.id,
            name: current.user.name,
            role: current.user.role,
          },
        };
      },
    }),
    CredentialsProvider({
      id: "impersonation-exit",
      name: "Impersonation Exit",
      credentials: {},
      async authorize() {
        const current = await getServerSession(authOptions);
        if (!current?.user?.impersonatedBy) return null;

        const adminId = current.user.impersonatedBy.id;
        await dbConnect();
        const admin = await User.findById(adminId);
        if (!admin || !isStaffRole(admin.role) || admin.status !== "VERIFIED") {
          return null;
        }

        await logImpersonation({
          actorId: admin._id,
          actorName: `${admin.firstName} ${admin.lastName}`,
          actorRole: admin.role,
          targetId: current.user.id,
          targetName: current.user.name,
          targetRole: current.user.role,
          action: "END",
        });

        return {
          id: admin._id.toString(),
          name: `${admin.firstName} ${admin.lastName}`,
          email: admin.email,
          role: admin.role,
          position: admin.position,
          status: admin.status,
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
        token.position = user.position;
        if (user.impersonatedBy) {
          token.impersonatedBy = user.impersonatedBy;
        } else {
          delete token.impersonatedBy;
        }
      }
      return token;
    },
    // برای اضافه کردن role به session
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.status = token.status;
        session.user.position = token.position;
        session.user.impersonatedBy = token.impersonatedBy;
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
