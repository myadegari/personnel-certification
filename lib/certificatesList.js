import Enrollment, { LIVE_ENROLLMENT_FILTER } from "@/models/Enrollment";
import GuestCertificate from "@/models/GuestCertificate";
import { fromShamsi } from "@/lib/persian-date";
import { normalizePersianDigits } from "@/lib/normalize-persian-digits";

export const DEFAULT_CERT_LIMIT = 10;
export const MAX_CERT_LIMIT = 50;

/**
 * Build a paginated, filterable list of issued certificates for a set of
 * courses (approved + completed enrollments and completed guest certificates).
 * Shared by the deputy and signatory certificate endpoints so both surface the
 * exact same rows/sorting/search semantics.
 *
 * @param {object} p
 * @param {Array<{_id:any,name?:string,courseSeq?:number|null,date?:number}>} p.courses
 *   Already-scoped course documents (must carry `_id` and `date`; `name`/
 *   `courseSeq` are used for the year filter and row labels).
 * @param {string} [p.courseId]  Restrict to a single course id.
 * @param {number|null} [p.year] Jalali year of the course date, or null.
 * @param {string} [p.q]         Name / nationalId search term.
 * @param {number} [p.page]
 * @param {number} [p.limit]
 * @returns {Promise<{ certificates: object[], pagination: { total:number, page:number, pageCount:number, limit:number } }>}
 */
export async function queryCertificatesForCourses({
  courses = [],
  courseId = "",
  year = null,
  q = "",
  page = 1,
  limit = DEFAULT_CERT_LIMIT,
}) {
  let scoped = courses;

  // Year filter: Jalali year of the course date (same semantics as my-courses).
  if (year != null) {
    const startSec = fromShamsi({ year, month: 1, day: 1 }).getTime() / 1000;
    const endSec = fromShamsi({ year: year + 1, month: 1, day: 1 }).getTime() / 1000;
    scoped = scoped.filter((c) => c.date >= startSec && c.date < endSec);
  }

  let courseIds = scoped.map((c) => c._id);
  if (courseId) {
    courseIds = courseIds.filter((id) => String(id) === courseId);
    if (!courseIds.length) {
      return { certificates: [], pagination: { total: 0, page, pageCount: 0, limit } };
    }
  }

  const [enrollments, guestCertificates] = await Promise.all([
    Enrollment.find({
      course: { $in: courseIds },
      status: "APPROVED",
      certificateStatus: "completed",
      ...LIVE_ENROLLMENT_FILTER,
    })
      .populate("user", "firstName lastName nationalId")
      .populate("course", "name courseSeq")
      .sort({ issuedAt: -1 })
      .lean(),
    GuestCertificate.find({
      course: { $in: courseIds },
      certificateStatus: "completed",
    })
      .populate("course", "name courseSeq")
      .sort({ issuedAt: -1 })
      .lean(),
  ]);

  // Search by name or nationalId. nationalIds are stored as Latin or Persian
  // digits, so the query is matched against both variants.
  const qNorm = normalizePersianDigits(q).toLowerCase();
  const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
  const qFa = qNorm ? qNorm.replace(/\d/g, (d) => FA_DIGITS[Number(d)]) : null;

  const matches = (fullName, nationalId) => {
    if (!qNorm) return true;
    const inName = (fullName || "").toLowerCase().includes(qNorm);
    const idStr = String(nationalId || "");
    return inName || idStr === qNorm || idStr === qFa;
  };

  const certRows = [
    ...enrollments
      .map((e) => ({
        enrollmentId: e._id,
        guestId: null,
        isGuest: false,
        fullName: `${e.user?.firstName || ""} ${e.user?.lastName || ""}`.trim(),
        nationalId: e.user?.nationalId || null,
        courseId: e.course?._id ? String(e.course._id) : null,
        courseName: e.course?.name,
        courseSeq: e.course?.courseSeq ?? null,
        certificateUniqueId: e.certificateUniqueId,
        certificateUrl: e.certificateUrl,
        issuedAt: e.issuedAt,
      }))
      .filter((r) => matches(r.fullName, r.nationalId)),
    ...guestCertificates
      .map((g) => ({
        enrollmentId: null,
        guestId: g._id,
        isGuest: true,
        fullName: g.fullName,
        nationalId: g.nationalId,
        courseId: g.course?._id ? String(g.course._id) : null,
        courseName: g.course?.name,
        courseSeq: g.course?.courseSeq ?? null,
        certificateUniqueId: g.certificateNumber,
        certificateUrl: g.certificateUrl || `/verify/${g._id}`,
        issuedAt: g.issuedAt,
      }))
      .filter((r) => matches(r.fullName, r.nationalId)),
  ];

  // issuedAt is a zero-padded Jalali "YYYY/MM/DD" string, so descending
  // lexicographic order is chronological. Missing dates sort last.
  certRows.sort((a, b) => String(b.issuedAt || "").localeCompare(String(a.issuedAt || "")));

  const total = certRows.length;
  const pageCount = Math.ceil(total / limit);
  const start = (page - 1) * limit;

  return {
    certificates: certRows.slice(start, start + limit),
    pagination: { total, page, pageCount, limit },
  };
}
