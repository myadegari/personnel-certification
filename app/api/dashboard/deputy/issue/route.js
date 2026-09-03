import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { requireVerified } from "@/lib/authGuard";
import { validateCertificateRow } from "@/lib/csv";
import {
  authorizeIssue,
  findUserByNationalId,
  issueForExistingUser,
  issueForGuest,
} from "@/lib/certificateIssuance";
import { recordAuditEvent, AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from "@/lib/audit";

// POST /api/dashboard/deputy/issue
// Single manual certificate issuance: { courseId, firstName, lastName,
// nationalId, gender }. Existing users get an APPROVED enrollment +
// certificate; persons without an account receive a guest certificate.
export async function POST(request) {
  const { session, error } = await requireVerified();
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const courseId = String(body?.courseId || "").trim();
  if (!courseId) {
    return NextResponse.json({ error: "انتخاب دوره الزامی است." }, { status: 400 });
  }

  // Optional explicit issue date (unix seconds); must not predate the course.
  const issueDate = Number(body?.issueDate) || null;
  if (body?.issueDate != null && body.issueDate !== "" && !Number.isFinite(Number(body.issueDate))) {
    return NextResponse.json({ error: "تاریخ صدور نامعتبر است." }, { status: 400 });
  }

  const validation = validateCertificateRow({
    firstName: body?.firstName,
    lastName: body?.lastName,
    nationalId: body?.nationalId,
    gender: body?.gender,
  });
  if (!validation.ok) {
    return NextResponse.json({ error: validation.errors.join(" ") }, { status: 400 });
  }
  const data = validation.data;

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

  try {
    const existingUser = await findUserByNationalId(data.nationalId);
    let outcome;
    let isGuest = false;

    if (existingUser) {
      outcome = await issueForExistingUser(existingUser, course, { issueDate });
    } else {
      outcome = await issueForGuest(data, course, session.user, { issueDate });
      isGuest = true;
    }

    if (outcome.skipped) {
      return NextResponse.json({ skipped: true, reason: outcome.reason });
    }

    await recordAuditEvent({
      request,
      session,
      action: AUDIT_ACTIONS.CERTIFICATE_ISSUE,
      resourceType: AUDIT_RESOURCE_TYPES.CERTIFICATE,
      metadata: {
        courseId,
        courseName: course.name,
        nationalId: data.nationalId,
        fullName: `${data.firstName} ${data.lastName}`,
        certificateNumber: outcome.certificateUniqueId,
        isGuest,
        issuedAt: outcome.issuedAt ?? null,
      },
    });

    return NextResponse.json({
      issued: true,
      isGuest,
      certificateNumber: outcome.certificateUniqueId,
      guestId: outcome.guestId?.toString() || null,
    });
  } catch (err) {
    console.error("Single issue error:", err);
    return NextResponse.json(
      { error: err.message || "خطا در صدور گواهی" },
      { status: 500 }
    );
  }
}
