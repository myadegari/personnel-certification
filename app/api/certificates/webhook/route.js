import { NextResponse } from "next/server";
import crypto from "crypto";
import dbConnect from "@/lib/dbConnect";
import Enrollment from "@/models/Enrollment";
import { recordAuditEvent, AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TERMINAL = new Set(["completed", "failed"]);
const VALID_STATUSES = new Set(["pending", "processing", "completed", "failed"]);
const MAX_CLOCK_SKEW_SECONDS = 5 * 60;

function verifySignature(rawBody, signatureHeader, timestampHeader) {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    // Misconfiguration: refuse rather than accept unsigned callbacks.
    return false;
  }
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) {
    return false;
  }
  // Replay protection: the worker signs "{timestamp}.{raw_body}" and sends the
  // timestamp in a header; reject anything outside the skew window.
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
// mirrors them onto the matching Enrollment (looked up by jobId). The update
// is atomic and refuses to touch enrollments that already reached a terminal
// state, so out-of-order retries can never downgrade a finished certificate.
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
    // 400 (non-retryable) so the worker does not hammer us with garbage.
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  await dbConnect();

  const result = await Enrollment.findOneAndUpdate(
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

  if (!result) {
    // Either no enrollment has this jobId (the approval may not have finished
    // persisting yet — the worker retries), or the status is already terminal
    // and the update was intentionally ignored.
    const existing = await Enrollment.findOne({ jobId })
      .select("_id")
      .lean();
    if (existing) {
      return NextResponse.json({ ok: true, ignored: true });
    }
    return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });
  }

  // System-originated event: the actor is the certificate owner, no session.
  if (status === "completed") {
    await recordAuditEvent({
      actor: { id: result.user },
      action: AUDIT_ACTIONS.CERTIFICATE_ISSUED,
      resourceType: AUDIT_RESOURCE_TYPES.CERTIFICATE,
      resourceId: result._id,
      metadata: { fileId: fileId || null, jobId },
    });
  }

  return NextResponse.json({ ok: true });
}
