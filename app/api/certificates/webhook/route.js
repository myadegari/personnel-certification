import { NextResponse } from "next/server";
import crypto from "crypto";
import dbConnect from "@/lib/dbConnect";
import Enrollment from "@/models/Enrollment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Terminal statuses are final; once reached, later callbacks are ignored so an
// out-of-order retry can never downgrade a completed certificate to processing.
const TERMINAL = new Set(["completed", "failed"]);

function verifySignature(rawBody, header) {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    // Misconfiguration: refuse rather than accept unsigned callbacks.
    return false;
  }
  if (!header || !header.startsWith("sha256=")) {
    return false;
  }
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex");
  const received = header.slice("sha256=".length);
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(received, "hex");
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

// POST /api/certificates/webhook
// Receives HMAC-SHA256-signed certificate status updates from the worker and
// mirrors them onto the matching Enrollment (looked up by jobId).
export async function POST(request) {
  const rawBody = await request.text();

  if (!verifySignature(rawBody, request.headers.get("x-webhook-signature"))) {
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

  await dbConnect();

  const enrollment = await Enrollment.findOne({ jobId });
  if (!enrollment) {
    // The approval request may not have finished persisting jobId yet; the
    // worker retries, so a transient 404 here is expected and harmless.
    return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });
  }

  if (TERMINAL.has(enrollment.certificateStatus)) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  enrollment.certificateStatus = status;
  if (status === "completed" && fileId) {
    enrollment.certificateFileId = fileId;
  }
  await enrollment.save();

  return NextResponse.json({ ok: true });
}
