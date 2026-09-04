import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcrypt";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { requireAdmin } from "@/lib/authGuard";
import { canManageUser } from "@/lib/roles";
import { recordAuditEvent, AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from "@/lib/audit";

const MIN_LENGTH = 8;
// Readable alphabet: no I/l/1/O/0 to survive being read over the phone.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

function generateTempPassword(length = 12) {
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

// Admin issues a temporary password (offline reset). The plaintext is returned
// exactly once so the admin can hand it to the user; only the hash is stored.
export async function POST(request, { params }) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    await dbConnect();
    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (!canManageUser(session.user.role, user.role)) {
      return NextResponse.json(
        { error: "You cannot manage this user" },
        { status: 403 }
      );
    }

    let tempPassword;
    if (typeof body?.password === "string" && body.password.trim()) {
      tempPassword = body.password;
      if (tempPassword.length < MIN_LENGTH) {
        return NextResponse.json(
          { error: `رمز عبور باید حداقل ${MIN_LENGTH} کاراکتر باشد.` },
          { status: 400 }
        );
      }
    } else {
      tempPassword = generateTempPassword();
    }

    user.password = await bcrypt.hash(tempPassword, 10);
    user.mustChangePassword = true;
    user.passwordResetRequested = false;
    user.passwordResetRequestedAt = undefined;
    await user.save();

    await recordAuditEvent({
      request,
      session,
      action: AUDIT_ACTIONS.ADMIN_SET_TEMP_PASSWORD,
      resourceType: AUDIT_RESOURCE_TYPES.USER,
      resourceId: user._id,
      metadata: {
        targetName: `${user.firstName} ${user.lastName}`.trim(),
        generated: !(typeof body?.password === "string" && body.password.trim()),
      },
    });

    return NextResponse.json({ tempPassword });
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Failed to set temporary password" },
      { status: 500 }
    );
  }
}
