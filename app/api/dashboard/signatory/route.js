import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Course from "@/models/Course";
import Enrollment, { LIVE_ENROLLMENT_FILTER } from "@/models/Enrollment";
import GuestCertificate from "@/models/GuestCertificate";
import { requireVerified } from "@/lib/authGuard";

// GET /api/dashboard/signatory
// Courses where the caller is the first or second signatory (any visibility),
// each with the number of certificates issued for it. Read-only overview that
// backs the user-panel "courses I sign" view. Scoped to the caller's own id,
// so a non-signatory simply gets an empty list (no role gate needed).
export async function GET() {
  const { session, error } = await requireVerified();
  if (error) return error;

  try {
    await dbConnect();
    const me = session.user.id;

    const courses = await Course.find({ $or: [{ signatory: me }, { signatory2: me }] })
      .select("_id name courseCode date duration organizingUnit visibility signatory signatory2")
      .sort({ date: -1 })
      .lean();

    const courseIds = courses.map((c) => c._id);

    const [enrollAgg, guestAgg] = await Promise.all([
      Enrollment.aggregate([
        {
          $match: {
            course: { $in: courseIds },
            status: "APPROVED",
            certificateStatus: "completed",
            ...LIVE_ENROLLMENT_FILTER,
          },
        },
        { $group: { _id: "$course", count: { $sum: 1 } } },
      ]),
      GuestCertificate.aggregate([
        { $match: { course: { $in: courseIds }, certificateStatus: "completed" } },
        { $group: { _id: "$course", count: { $sum: 1 } } },
      ]),
    ]);

    const enrollMap = Object.fromEntries(enrollAgg.map((x) => [String(x._id), x.count]));
    const guestMap = Object.fromEntries(guestAgg.map((x) => [String(x._id), x.count]));

    const coursesData = courses.map((c) => {
      const isPrimary = String(c.signatory || "") === String(me);
      const isSecondary = String(c.signatory2 || "") === String(me);
      const issued = (enrollMap[String(c._id)] || 0) + (guestMap[String(c._id)] || 0);
      return {
        _id: c._id,
        name: c.name,
        courseCode: c.courseCode,
        date: c.date,
        duration: c.duration,
        organizingUnit: c.organizingUnit,
        visibility: c.visibility || "PUBLIC",
        role: isPrimary && isSecondary ? "both" : isPrimary ? "primary" : "secondary",
        stats: { issued },
      };
    });

    return NextResponse.json({ courses: coursesData });
  } catch (err) {
    console.error("Dashboard signatory error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
