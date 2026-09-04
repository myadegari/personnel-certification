// فایل: app/api/auth/[...nextauth]/route.js
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getServerSession } from "next-auth";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import bcrypt from "bcrypt";
import { isStaffRole, canImpersonate } from "@/lib/roles";
import { recordAuditEvent, AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from "@/lib/audit";

async function logImpersonation(entry) {
  await recordAuditEvent({
    actor: { id: entry.actorId, name: entry.actorName, role: entry.actorRole },
    action: entry.action,
    resourceType: AUDIT_RESOURCE_TYPES.USER,
    resourceId: entry.targetId,
    metadata: { targetName: entry.targetName, targetRole: entry.targetRole },
  });
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
          status: user.status,
          mustChangePassword: !!user.mustChangePassword,
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
          action: AUDIT_ACTIONS.IMPERSONATE_START,
        });

        return {
          id: target._id.toString(),
          name: `${target.firstName} ${target.lastName}`,
          email: target.email,
          role: target.role || "USER",
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
          action: AUDIT_ACTIONS.IMPERSONATE_END,
        });

        return {
          id: admin._id.toString(),
          name: `${admin.firstName} ${admin.lastName}`,
          email: admin.email,
          role: admin.role,
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
        token.mustChangePassword = !!user.mustChangePassword;
        if (user.impersonatedBy) {
          token.impersonatedBy = user.impersonatedBy;
        } else {
          delete token.impersonatedBy;
        }
        return token;
      }
      // Live-clear the forced-change flag once the user has set a new password,
      // without requiring a re-login. Only pays a DB read while still flagged.
      if (token.mustChangePassword) {
        await dbConnect();
        const fresh = await User.findById(token.id).select("mustChangePassword").lean();
        token.mustChangePassword = !!fresh?.mustChangePassword;
      }
      return token;
    },
    // برای اضافه کردن role به session
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.status = token.status;
        session.user.impersonatedBy = token.impersonatedBy;
        session.user.mustChangePassword = token.mustChangePassword;
      }
      return session;
    },
  },
  events: {
    // NextAuth events have no access to the Request, so LOGIN/LOGOUT entries
    // carry no ip/userAgent (route-instrumented events do).
    async signIn({ user }) {
      // Impersonation sign-ins are logged explicitly as IMPERSONATE_*.
      if (user?.impersonatedBy) return;
      await recordAuditEvent({
        actor: { id: user?.id, name: user?.name, role: user?.role },
        action: AUDIT_ACTIONS.LOGIN,
      });
    },
    async signOut({ token }) {
      if (token?.impersonatedBy) {
        // Direct logout from an impersonated session (the admin never used
        // the exit provider): close the impersonation trail here.
        await recordAuditEvent({
          actor: {
            id: token.impersonatedBy.id,
            name: token.impersonatedBy.name,
            role: token.impersonatedBy.role,
          },
          action: AUDIT_ACTIONS.IMPERSONATE_END,
          resourceType: AUDIT_RESOURCE_TYPES.USER,
          resourceId: token.id,
          metadata: { targetName: token.name, targetRole: token.role },
        });
        return;
      }
      await recordAuditEvent({
        actor: { id: token?.id, name: token?.name, role: token?.role },
        action: AUDIT_ACTIONS.LOGOUT,
      });
    },
  },
  pages: {
    signIn: "/authentication/login", // صفحه ورود سفارشی
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
