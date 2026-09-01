import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import Course from "@/models/Course";
import User from "@/models/User";
import Enrollment from "@/models/Enrollment";
import GuestCertificate from "@/models/GuestCertificate";
import { processCertificateGeneration } from "@/lib/certificateService";
import { requireVerified } from "@/lib/authGuard";
import { isStaffRole, ROLES } from "@/lib/roles";
import { parseCsv, validateCertificateRow } from "@/lib/csv";
import { recordAuditEvent, AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from "@/lib/audit";

const MAX_ROWS = 500;

function deputyIdOf(course) {
  if (!course?.deputy) return null;
  if (typeof course.deputy === "object" && course.deputy?._id) return String(course.deputy._id);
  return String(course.deputy);
}

// Only staff, or a DEPUTY_HEAD whose headed deputy owns the course, may bulk-issue.
async function assertBulkIssueAccess(session, course) {
  if (isStaffRole(session.user.role)) return { ok: true };
  if (session.user.role !== ROLES.DEPUTY_HEAD) {
    return { ok: false, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  const user = await User.findById(session.user.id).select("headedDeputy").lean();
  const headed = user?.headedDeputy ? String(user.headedDeputy) : null;
  if (headed && headed === deputyIdOf(course)) return { ok: true };
  return { ok: false, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
}

// Ensure an APPROVED enrollment for (user, course) and issue its certificate.
// Returns { skipped, reason?, certificateUniqueId? }.
async function issueForExistingUser(user, course) {
  let enrollment = await Enrollment.findOne({ user: user._id, course: course._id });

  if (enrollment?.status === "APPROVED") {
    if (enrollment.certificateStatus === "completed") {
      return { skipped: true, reason: "گواهی قبلاً صادر شده است." };
    }
    return { skipped: true, reason: "ثبت‌نام قبلاً تایید شده و در حال پردازش است." };
  }
  if (enrollment?.status === "REJECTED") {
    return { skipped: true, reason: "ثبت‌نام این کاربر قبلاً رد شده است." };
  }

  const target = enrollment || new Enrollment({
    user: user._id,
    course: course._id,
    status: "PENDING",
    metadata: { courseStatus: "EXIST" },
  });

  const certificateData = await processCertificateGeneration({ enrollment: target, user, course });

  target.jobId = certificateData.jobId;
  target.issuedAt = certificateData.issuedAt;
  target.certificateUniqueId = certificateData.certificateUniqueId;
  target.certificateUrl = certificateData.certificateUrl;
  target.certificateStatus = "pending";
  target.status = "APPROVED";
  await target.save();

  return { skipped: false, certificateUniqueId: certificateData.certificateUniqueId };
}

// Issue a guest certificate (person without an account). The guest's own _id
// becomes the certificate's certificationId/jobId, so /verify/<id> works.
async function issueForGuest(data, course, actor) {
  const alreadyIssued = await GuestCertificate.findOne({
    nationalId: data.nationalId,
    course: course._id,
    certificateStatus: "completed",
  });
  if (alreadyIssued) {
    return { skipped: true, reason: "گواهی مهمان قبلاً صادر شده است." };
  }

  const guest = await GuestCertificate.create({
    fullName: `${data.firstName} ${data.lastName}`,
    nationalId: data.nationalId,
    gender: data.gender,
    course: course._id,
    issuedBy: actor.id,
    certificateStatus: "pending",
  });

  const user = {
    gender: data.gender,
    firstName: data.firstName,
    lastName: data.lastName,
    nationalId: data.nationalId,
  };

  const certificateData = await processCertificateGeneration({
    enrollment: null,
    user,
    course,
    guestCertificate: guest,
  });

  guest.jobId = certificateData.jobId;
  guest.issuedAt = certificateData.issuedAt;
  guest.certificateNumber = certificateData.certificateUniqueId;
  guest.certificateUrl = certificateData.certificateUrl;
  await guest.save();

  return { skipped: false, certificateUniqueId: certificateData.certificateUniqueId, guestId: guest._id };
}

// POST /api/dashboard/deputy/bulk-issue
// Bulk-issue certificates for a course from a CSV (firstName,lastName,
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

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "فایل CSV ارسال نشده است." }, { status: 400 });
  }
  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    return NextResponse.json({ error: "دوره نامعتبر است." }, { status: 400 });
  }

  const text = await file.text();
  let rawRows;
  try {
    rawRows = parseCsv(text);
  } catch (parseError) {
    return NextResponse.json(
      { error: "فایل CSV قابل خواندن نیست: " + parseError.message },
      { status: 400 }
    );
  }
  if (!rawRows.length) {
    return NextResponse.json({ error: "فایل CSV خالی است." }, { status: 400 });
  }
  if (rawRows.length > MAX_ROWS) {
    return NextResponse.json(
      { error: `حداکثر ${MAX_ROWS} ردیف مجاز است.` },
      { status: 400 }
    );
  }

  await dbConnect();

  const course = await Course.findById(courseId)
    .populate("deputy signatory signatory2")
    .lean();
  if (!course) {
    return NextResponse.json({ error: "دوره یافت نشد." }, { status: 404 });
  }

  const access = await assertBulkIssueAccess(session, course);
  if (!access.ok) return access.error;

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
    const line = i + 2;
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

    const existingUser = await User.findOne({ nationalId: data.nationalId });

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
        const outcome = await issueForExistingUser(existingUser, course);
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
        const outcome = await issueForGuest(data, course, session.user);
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
      metadata: { courseId, courseName: course.name, mode, summary },
    });
  }

  return NextResponse.json({ mode, courseId, summary, results });
}
