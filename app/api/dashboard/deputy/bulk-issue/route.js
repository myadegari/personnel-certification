import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { requireVerified } from "@/lib/authGuard";
import { parseWorkbook, validateCertificateRow } from "@/lib/xlsx";
import {
  authorizeIssue,
  findUserByNationalId,
  issueForExistingUser,
  issueForGuest,
} from "@/lib/certificateIssuance";
import { recordAuditEvent, AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from "@/lib/audit";

const MAX_ROWS = 500;

// POST /api/dashboard/deputy/bulk-issue
// Bulk-issue certificates for a course from an XLSX (firstName,lastName,
// nationalId,gender). Existing users get an APPROVED enrollment + certificate;
// persons without an account receive a guest certificate. dry-run validates
// and previews; commit performs the issuance.
export async function POST(request) {
  const { session, error } = await requireVerified();
  if (error) return error;

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const file = formData.get("file");
  const mode = formData.get("mode") === "commit" ? "commit" : "dry-run";
  const courseId = String(formData.get("courseId") || "").trim();
  // Optional explicit issue date (unix seconds) applied to the whole file.
  const issueDateRaw = formData.get("issueDate");
  const issueDate = Number(issueDateRaw) || null;

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "فایل اکسل ارسال نشده است." }, { status: 400 });
  }
  if (!courseId) {
    return NextResponse.json({ error: "انتخاب دوره الزامی است." }, { status: 400 });
  }
  if (issueDateRaw != null && issueDateRaw !== "" && !Number.isFinite(Number(issueDateRaw))) {
    return NextResponse.json({ error: "تاریخ صدور نامعتبر است." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  let rawRows;
  try {
    rawRows = await parseWorkbook(bytes);
  } catch (parseError) {
    return NextResponse.json(
      { error: "فایل اکسل قابل خواندن نیست: " + parseError.message },
      { status: 400 }
    );
  }
  if (!rawRows.length) {
    return NextResponse.json({ error: "فایل اکسل خالی است." }, { status: 400 });
  }
  if (rawRows.length > MAX_ROWS) {
    return NextResponse.json(
      { error: `حداکثر ${MAX_ROWS} ردیف مجاز است.` },
      { status: 400 }
    );
  }

  await dbConnect();

  const access = await authorizeIssue(session, courseId);
  if (access.error) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const course = access.course;

  if (issueDate && Number.isFinite(course.date) && issueDate < course.date) {
    return NextResponse.json(
      { error: "تاریخ صدور نمی‌تواند قدیمی‌تر از تاریخ برگزاری دوره باشد." },
      { status: 400 }
    );
  }

  const results = [];
  const summary = {
    total: rawRows.length,
    issued: 0,
    existingUser: 0,
    guest: 0,
    skipped: 0,
    errors: 0,
  };
  const seenNationalIds = new Set();

  for (let i = 0; i < rawRows.length; i += 1) {
    const line = rawRows[i].__line; // true spreadsheet row number
    const validation = validateCertificateRow(rawRows[i]);
    if (!validation.ok) {
      summary.errors += 1;
      results.push({ line, status: "error", errors: validation.errors });
      continue;
    }

    const data = validation.data;

    if (seenNationalIds.has(data.nationalId)) {
      summary.errors += 1;
      results.push({ line, nationalId: data.nationalId, status: "error", errors: ["کد ملی تکراری در فایل است."] });
      continue;
    }
    seenNationalIds.add(data.nationalId);

    const existingUser = await findUserByNationalId(data.nationalId);

    if (mode === "dry-run") {
      if (existingUser) {
        summary.existingUser += 1;
        results.push({ line, nationalId: data.nationalId, status: "existing_user", errors: [] });
      } else {
        summary.guest += 1;
        results.push({ line, nationalId: data.nationalId, status: "guest", errors: [] });
      }
      continue;
    }

    // commit
    try {
      if (existingUser) {
        const outcome = await issueForExistingUser(existingUser, course, { issueDate });
        if (outcome.skipped) {
          summary.skipped += 1;
          results.push({ line, nationalId: data.nationalId, status: "skipped", errors: [outcome.reason] });
        } else {
          summary.issued += 1;
          results.push({
            line,
            nationalId: data.nationalId,
            status: "issued",
            certificateNumber: outcome.certificateUniqueId,
            errors: [],
          });
        }
      } else {
        const outcome = await issueForGuest(data, course, session.user, { issueDate });
        if (outcome.skipped) {
          summary.skipped += 1;
          results.push({ line, nationalId: data.nationalId, status: "skipped", errors: [outcome.reason] });
        } else {
          summary.guest += 1;
          summary.issued += 1;
          results.push({
            line,
            nationalId: data.nationalId,
            status: "guest_issued",
            certificateNumber: outcome.certificateUniqueId,
            guestId: outcome.guestId?.toString(),
            errors: [],
          });
        }
      }
    } catch (err) {
      summary.errors += 1;
      results.push({
        line,
        nationalId: data.nationalId,
        status: "error",
        errors: [err.message || "خطای نامشخص."],
      });
    }
  }

  if (mode === "commit") {
    await recordAuditEvent({
      request,
      session,
      action: AUDIT_ACTIONS.CERTIFICATE_BULK_ISSUE,
      resourceType: AUDIT_RESOURCE_TYPES.CERTIFICATE,
      metadata: { courseId, courseName: course.name, mode, summary, issuedAt: issueDate ? new Date(issueDate * 1000).toISOString() : null },
    });
  }

  return NextResponse.json({ mode, courseId, summary, results });
}
