import { NextResponse } from "next/server";
import crypto from "crypto";
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import Enrollment from "@/models/Enrollment";
import GuestCertificate from "@/models/GuestCertificate";
import { recordAuditEvent, AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TERMINAL = new Set(["completed", "failed"]);
const VALID_STATUSES = new Set(["pending", "processing", "completed", "failed"]);
const MAX_CLOCK_SKEW_SECONDS = 5 * 60;

function verifySignature(rawBody, signatureHeader, timestampHeader) {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    return false;
  }
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) {
    return false;
  }
  const timestamp = Number(timestampHeader);
  if (!Number.isFinite(timestamp)) {
    return false;
  }
  if (Math.abs(Date.now() / 1000 - timestamp) > MAX_CLOCK_SKEW_SECONDS) {
    return false;
  }
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${timestampHeader}.${rawBody}`, "utf8")
    .digest("hex");
  const received = signatureHeader.slice("sha256=".length);
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(received, "hex");
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

// POST /api/certificates/webhook
// Receives HMAC-SHA256-signed certificate status updates from the worker and
// mirrors them onto the matching Enrollment or GuestCertificate (looked up by
// jobId). The update is atomic and refuses to touch records that already
// reached a terminal state, so out-of-order retries can never downgrade a
// finished certificate.
export async function POST(request) {
  const rawBody = await request.text();

  const signature = request.headers.get("x-webhook-signature");
  const timestamp = request.headers.get("x-webhook-timestamp");
  if (!verifySignature(rawBody, signature, timestamp)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { job_id: jobId, status, file_id: fileId } = payload || {};
  if (!jobId || !status) {
    return NextResponse.json({ error: "Missing job_id or status" }, { status: 400 });
  }
  if (!VALID_STATUSES.has(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  await dbConnect();

  // Try Enrollment first (normal user certificates).
  const enrollmentResult = await Enrollment.findOneAndUpdate(
    { jobId, certificateStatus: { $nin: [...TERMINAL] } },
    {
      $set: {
        certificateStatus: status,
        ...(status === "completed" && fileId
          ? { certificateFileId: fileId }
          : {}),
      },
    },
    { new: true }
  );

  if (enrollmentResult) {
    if (status === "completed") {
      await recordAuditEvent({
        actor: { id: enrollmentResult.user },
        action: AUDIT_ACTIONS.CERTIFICATE_ISSUED,
        resourceType: AUDIT_RESOURCE_TYPES.CERTIFICATE,
        resourceId: enrollmentResult._id,
        metadata: { fileId: fileId || null, jobId },
      });
    }
    return NextResponse.json({ ok: true });
  }

  // Guest certificate (bulk-issued to persons without an account).
  if (mongoose.Types.ObjectId.isValid(jobId)) {
    const guestResult = await GuestCertificate.findOneAndUpdate(
      { _id: jobId, certificateStatus: { $nin: [...TERMINAL] } },
      {
        $set: {
          certificateStatus: status,
          ...(status === "completed" && fileId ? { fileId } : {}),
        },
      },
      { new: true }
    );

    if (guestResult) {
      if (status === "completed") {
        await recordAuditEvent({
          actor: { id: guestResult.issuedBy },
          action: AUDIT_ACTIONS.CERTIFICATE_ISSUED,
          resourceType: AUDIT_RESOURCE_TYPES.CERTIFICATE,
          resourceId: guestResult._id,
          metadata: { fileId: fileId || null, jobId },
        });
      }
      return NextResponse.json({ ok: true });
    }
  }

  // Nothing found — either the jobId is unknown (worker retries) or the
  // record is already terminal.
  const existing = await Enrollment.findOne({ jobId }).select("_id").lean();
  if (existing) {
    return NextResponse.json({ ok: true, ignored: true });
  }
  return NextResponse.json({ error: "Record not found" }, { status: 404 });
}
