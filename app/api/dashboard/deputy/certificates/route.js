import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Course from "@/models/Course";
import Enrollment, { LIVE_ENROLLMENT_FILTER } from "@/models/Enrollment";
import GuestCertificate from "@/models/GuestCertificate";
import { requireVerified } from "@/lib/authGuard";
import { resolveDeputyHead } from "@/lib/deputyAccess";
import { fromShamsi } from "@/lib/persian-date";
import { normalizePersianDigits } from "@/lib/normalize-persian-digits";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

// Certificates issued for the deputy head's own PRIVATE courses, filterable
// by course, Jalali year of the course date, and a name/nationalId search.
export async function GET(request) {
  const { session, error } = await requireVerified();
  if (error) return error;

  if (session.user.role !== "DEPUTY_HEAD") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await dbConnect();
    const access = await resolveDeputyHead(session);
    if (access.error) return access.error;

    const { searchParams } = new URL(request.url);
    const courseId = (searchParams.get("courseId") || "").trim();
    const yearParam = searchParams.get("year");
    const q = (searchParams.get("q") || "").trim();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT)
    );

    // Private courses of this deputy only.
    const courseFilter = { deputy: access.deputy._id, visibility: "DEPUTY" };
    const courses = await Course.find(courseFilter).select("_id name courseSeq date").lean();
    let scopedCourses = courses;

    // Year filter: Jalali year of the course date (same semantics as my-courses).
    if (yearParam) {
      const year = Number(yearParam);
      if (!Number.isInteger(year) || year < 1300 || year > 1500) {
        return NextResponse.json({ error: "سال نامعتبر است." }, { status: 400 });
      }
      const startSec = fromShamsi({ year, month: 1, day: 1 }).getTime() / 1000;
      const endSec = fromShamsi({ year: year + 1, month: 1, day: 1 }).getTime() / 1000;
      scopedCourses = scopedCourses.filter((c) => c.date >= startSec && c.date < endSec);
    }

    let courseIds = scopedCourses.map((c) => c._id);
    if (courseId) {
      courseIds = courseIds.filter((id) => String(id) === courseId);
      if (!courseIds.length) {
        return NextResponse.json({
          certificates: [],
          pagination: { total: 0, page, pageCount: 0, limit },
        });
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

    // Search by name or nationalId. nationalIds are stored as Latin or
    // Persian digits, so the query is matched against both variants.
    const qNorm = normalizePersianDigits(q).toLowerCase();
    const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
    const qFa = qNorm
      ? qNorm.replace(/\d/g, (d) => FA_DIGITS[Number(d)])
      : null;

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

    return NextResponse.json({
      certificates: certRows.slice(start, start + limit),
      pagination: { total, page, pageCount, limit },
    });
  } catch (err) {
    console.error("Deputy certificates list error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
