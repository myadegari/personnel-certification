import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Course from "@/models/Course";
import { requireVerified } from "@/lib/authGuard";
import { resolveDeputyHead } from "@/lib/deputyAccess";
import {
  queryCertificatesForCourses,
  DEFAULT_CERT_LIMIT,
  MAX_CERT_LIMIT,
} from "@/lib/certificatesList";

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
      MAX_CERT_LIMIT,
      Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_CERT_LIMIT), 10) || DEFAULT_CERT_LIMIT)
    );

    let year = null;
    if (yearParam) {
      year = Number(yearParam);
      if (!Number.isInteger(year) || year < 1300 || year > 1500) {
        return NextResponse.json({ error: "سال نامعتبر است." }, { status: 400 });
      }
    }

    // Union scope: this deputy's private (manageable) courses ∪ courses the
    // head signs (first/second, any visibility), deduped by id.
    const me = session.user.id;
    const [managedCourses, signedCourses] = await Promise.all([
      Course.find({ deputy: access.deputy._id, visibility: "DEPUTY" })
        .select("_id name courseSeq date")
        .lean(),
      Course.find({ $or: [{ signatory: me }, { signatory2: me }] })
        .select("_id name courseSeq date")
        .lean(),
    ]);
    const byId = new Map();
    for (const c of [...managedCourses, ...signedCourses]) byId.set(String(c._id), c);
    const courses = [...byId.values()];

    const { certificates, pagination } = await queryCertificatesForCourses({
      courses,
      courseId,
      year,
      q,
      page,
      limit,
    });

    return NextResponse.json({ certificates, pagination });
  } catch (err) {
    console.error("Deputy certificates list error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
