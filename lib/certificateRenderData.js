import { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";

// Absolute public URL of this app; encoded into certificate QR codes so scans
// resolve to a real host instead of a bare path.
function getSiteUrl() {
  const url =
    process.env.PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
  return url.replace(/\/+$/, "");
}

/**
 * Builds the complete, self-contained payload needed to render a certificate
 * PDF. This is the single source of truth shared by issuance (persisted as the
 * Certificate snapshot) and the Python render service. It performs NO database
 * access and imports NO models, so it is safe to call from standalone scripts.
 *
 * `course` must have `signatory` (and optionally `signatory2`) populated and
 * carry `date` (unix seconds) + `duration`.
 */
export function buildCertificateRenderData({
  user,
  course,
  certNumber,
  issuedAt,
  certificationId,
}) {
  return {
    category: course.signatory2 ? "2" : "1",
    user: {
      userId: user._id || null,
      gender: user.gender,
      firstName: user.firstName,
      lastName: user.lastName,
      nationalId: user.nationalId,
    },
    course: {
      courseId: course._id,
      courseCode: course.courseCode,
      name: course.name,
      organizingUnit: course.organizingUnit,
      organizingUnit2: course.organizingUnit2 || "",
      date: new DateObject({
        date: new Date(course.date * 1000),
        calendar: persian,
      }).format("YYYY/MM/DD"),
      time: course.duration.toString(),
      signatory: {
        gender: course.signatory.gender,
        firstName: course.signatory.firstName,
        lastName: course.signatory.lastName,
        nationalId: course.signatory.nationalId,
        signature: course.signatory.signatureImage,
      },
      signatory2: course.signatory2
        ? {
            gender: course.signatory2.gender,
            firstName: course.signatory2.firstName,
            lastName: course.signatory2.lastName,
            nationalId: course.signatory2.nationalId,
            signature: course.signatory2.signatureImage,
          }
        : null,
      unitStamp: course.unitStamp,
      unitStamp2: course.unitStamp2,
    },
    certificateNumber: certNumber,
    issuedAt,
    certificationId,
    qr_url: `${getSiteUrl()}/verify/${certificationId}`,
  };
}
