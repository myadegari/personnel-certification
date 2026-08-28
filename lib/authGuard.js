import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

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
 * Ensures the caller is an authenticated ADMIN.
 * @returns {{session: object, error: null} | {session: null, error: NextResponse}}
 */
export async function requireAdmin() {
  const { session, error } = await requireAuth();
  if (error) return { session: null, error };
  if (session.user.role !== "ADMIN") {
    return {
      session: null,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { session, error: null };
}
