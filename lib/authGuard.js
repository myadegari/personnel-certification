import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { isStaffRole, isSuperAdmin, ROLES } from "@/lib/roles";

/**
 * Ensures the caller has a valid session.
 * @returns {{session: object, error: null} | {session: null, error: NextResponse}}
 */
export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return {
      session: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { session, error: null };
}

/**
 * Ensures the caller is an authenticated user whose account is VERIFIED.
 * Mirrors the page-level gating in proxy.js for the API layer, so a
 * NEED_TO_VERIFY account cannot act through direct API calls.
 * @returns {{session: object, error: null} | {session: null, error: NextResponse}}
 */
export async function requireVerified() {
  const { session, error } = await requireAuth();
  if (error) return { session: null, error };
  if (session.user.status !== "VERIFIED") {
    return {
      session: null,
      error: NextResponse.json(
        { error: "حساب کاربری شما هنوز تایید نشده است." },
        { status: 403 }
      ),
    };
  }
  return { session, error: null };
}

/**
 * Ensures the caller is an authenticated ADMIN or SUPERADMIN.
 * @returns {{session: object, error: null} | {session: null, error: NextResponse}}
 */
export async function requireAdmin() {
  const { session, error } = await requireAuth();
  if (error) return { session: null, error };
  if (!isStaffRole(session.user.role)) {
    return {
      session: null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { session, error: null };
}

/**
 * Ensures the caller is an authenticated SUPERADMIN.
 * @returns {{session: object, error: null} | {session: null, error: NextResponse}}
 */
export async function requireSuperAdmin() {
  const { session, error } = await requireAuth();
  if (error) return { session: null, error };
  if (!isSuperAdmin(session.user.role)) {
    return {
      session: null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { session, error: null };
}

/**
 * ADMIN/SUPERADMIN staff, or a DEPUTY_HEAD. Used by the shared-asset
 * endpoints (user search, media library list, stamp uploads) that deputy
 * heads need to manage their own courses.
 * @returns {{session: object, error: null} | {session: null, error: NextResponse}}
 */
export async function requireStaffOrDeputyHead() {
  const { session, error } = await requireVerified();
  if (error) return { session: null, error };
  if (!isStaffRole(session.user.role) && session.user.role !== ROLES.DEPUTY_HEAD) {
    return {
      session: null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { session, error: null };
}
