import mongoose from "mongoose";
import Course from "@/models/Course";
import User from "@/models/User";
import Enrollment from "@/models/Enrollment";
import GuestCertificate from "@/models/GuestCertificate";
import { processCertificateGeneration } from "@/lib/certificateService";
import { requireVerified } from "@/lib/authGuard";
import { isStaffRole, ROLES } from "@/lib/roles";
import { toPersianDigits } from "@/lib/persian-date";

export function deputyIdOf(course) {
  if (!course?.deputy) return null;
  if (typeof course.deputy === "object" && course.deputy?._id) return String(course.deputy._id);
  return String(course.deputy);
}

// nationalIds are stored in either Latin or Persian digits; match both.
export async function findUserByNationalId(nationalId) {
  return User.findOne({ nationalId: { $in: [nationalId, toPersianDigits(String(nationalId))] } });
}

/**
 * Auth for certificate issuance: staff (ADMIN/SUPERADMIN) may issue for any
 * course; a DEPUTY_HEAD only for courses owned by their headed deputy.
 * Returns { session, course } or { error: NextResponse }.
 */
export async function authorizeIssue(session, courseId) {
  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    return { error: "دوره نامعتبر است.", status: 400 };
  }
  const course = await Course.findById(courseId)
    .populate("deputy signatory signatory2")
    .lean();
  if (!course) {
    return { error: "دوره یافت نشد.", status: 404 };
  }

  if (isStaffRole(session.user.role)) return { session, course };
  if (session.user.role !== ROLES.DEPUTY_HEAD) {
    return { error: "Forbidden", status: 403 };
  }
  const user = await User.findById(session.user.id).select("headedDeputy").lean();
  const headed = user?.headedDeputy ? String(user.headedDeputy) : null;
  if (!headed || headed !== deputyIdOf(course)) {
    return { error: "Forbidden", status: 403 };
  }
  // Deputy heads may only issue for their own PRIVATE courses, never PUBLIC
  // center courses.
  if (course.visibility !== "DEPUTY") {
    return { error: "این دوره قابل صدور توسط معاونت نیست.", status: 403 };
  }
  return { session, course };
}

// Ensure an APPROVED enrollment for (user, course) and issue its certificate.
// issueDate (unix seconds) optionally back/forward-dates the certificate.
// Returns { skipped, reason?, certificateUniqueId? }.
export async function issueForExistingUser(user, course, { issueDate = null } = {}) {
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

  const certificateData = await processCertificateGeneration({ enrollment: target, user, course, issueDate });

  target.jobId = certificateData.jobId;
  target.issuedAt = certificateData.issuedAt;
  target.certificateUniqueId = certificateData.certificateUniqueId;
  target.certificateUrl = certificateData.certificateUrl;
  // The render-data snapshot is stored on issuance (Certificate doc), so the
  // certificate is immediately viewable/downloadable (generated on demand).
  target.certificateStatus = "completed";
  target.status = "APPROVED";
  await target.save();

  return { skipped: false, certificateUniqueId: certificateData.certificateUniqueId };
}

// Issue a guest certificate (person without an account). The guest's own _id
// becomes the certificate's certificationId/jobId, so /verify/<id> works.
// issueDate (unix seconds) optionally back/forward-dates the certificate.
export async function issueForGuest(data, course, actor, { issueDate = null } = {}) {
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
    issueDate,
  });

  guest.jobId = certificateData.jobId;
  guest.issuedAt = certificateData.issuedAt;
  guest.certificateNumber = certificateData.certificateUniqueId;
  guest.certificateUrl = certificateData.certificateUrl;
  // Snapshot stored on issuance -> immediately viewable (rendered on demand).
  guest.certificateStatus = "completed";
  await guest.save();

  return { skipped: false, certificateUniqueId: certificateData.certificateUniqueId, guestId: guest._id };
}
