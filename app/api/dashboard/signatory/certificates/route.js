import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Course from "@/models/Course";
import { requireVerified } from "@/lib/authGuard";
import {
  queryCertificatesForCourses,
  DEFAULT_CERT_LIMIT,
  MAX_CERT_LIMIT,
} from "@/lib/certificatesList";

// Certificates issued for every course where the caller is a signatory
// (first or second, any visibility), filterable by course, Jalali year of the
// course date, and a name/nationalId search. Scoped to the caller's own id.
export async function GET(request) {
  const { session, error } = await requireVerified();
  if (error) return error;

  try {
    await dbConnect();
    const me = session.user.id;

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

    const courses = await Course.find({ $or: [{ signatory: me }, { signatory2: me }] })
      .select("_id name courseSeq date")
      .lean();

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
    console.error("Signatory certificates list error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
