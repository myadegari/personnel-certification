import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import Course from "@/models/Course";
import Enrollment, { LIVE_ENROLLMENT_FILTER } from "@/models/Enrollment";
import GuestCertificate from "@/models/GuestCertificate";
import { requireVerified } from "@/lib/authGuard";
import { ROLES } from "@/lib/roles";

// GET /api/dashboard/deputy
// Tracking data for a DEPUTY_HEAD: their deputy, its courses (with
// enrollment stats and deadlines) and the certificates issued for them.
export async function GET() {
  const { session, error } = await requireVerified();
  if (error) return error;

  if (session.user.role !== ROLES.DEPUTY_HEAD) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await dbConnect();

    const user = await User.findById(session.user.id)
      .populate("headedDeputy")
      .lean();

    if (!user?.headedDeputy) {
      return NextResponse.json(
        { error: "برای شما معاونتی تعیین نشده است." },
        { status: 400 }
      );
    }

    const deputy = user.headedDeputy;

    // Deputy heads only manage their own PRIVATE courses; PUBLIC center
    // courses are never surfaced here. Signatories are populated (with their
    // deputy + units) so the edit dialog can prefill them without a refetch.
    const courses = await Course.find({ deputy: deputy._id, visibility: "DEPUTY" })
      .populate({
        path: "signatory",
        select: "firstName lastName deputy",
        populate: { path: "deputy", select: "name units" },
      })
      .populate({
        path: "signatory2",
        select: "firstName lastName deputy",
        populate: { path: "deputy", select: "name units" },
      })
      .sort({ date: -1 })
      .lean();

    const courseIds = courses.map((c) => c._id);

    // Per-course counts. "issued" is the number of completed certificates for a
    // course: approved+completed enrollments plus completed guest certificates.
    // (Certificate numbers are now sequenced per deputy/year, so there is no
    // longer a per-course counter to read from.)
    const [pendingCounts, approvedCounts, completedCounts, guestCompletedCounts] =
      await Promise.all([
        Enrollment.aggregate([
          { $match: { course: { $in: courseIds }, status: "PENDING", ...LIVE_ENROLLMENT_FILTER } },
          { $group: { _id: "$course", count: { $sum: 1 } } },
        ]),
        Enrollment.aggregate([
          { $match: { course: { $in: courseIds }, status: "APPROVED", ...LIVE_ENROLLMENT_FILTER } },
          { $group: { _id: "$course", count: { $sum: 1 } } },
        ]),
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

    const countMap = (arr) => Object.fromEntries(arr.map((x) => [String(x._id), x.count]));
    const pendingMap = countMap(pendingCounts);
    const approvedMap = countMap(approvedCounts);
    const completedMap = countMap(completedCounts);
    const guestCompletedMap = countMap(guestCompletedCounts);

    const coursesData = courses.map((c) => {
      const issuedCount =
        (completedMap[String(c._id)] || 0) + (guestCompletedMap[String(c._id)] || 0);
      return {
        _id: c._id,
        name: c.name,
        courseCode: c.courseCode,
        courseSeq: c.courseSeq ?? null,
        date: c.date,
        enrollmentDeadline: c.visibility === "DEPUTY" ? null : (c.enrollmentDeadline || c.date + 86399),
        duration: c.duration,
        organizingUnit: c.organizingUnit,
        organizingUnits: c.organizingUnits || [],
        organizingUnit2: c.organizingUnit2 || "",
        organizingUnits2: c.organizingUnits2 || [],
        signatory: c.signatory || null,
        signatory2: c.signatory2 || null,
        unitStamp: c.unitStamp || null,
        unitStamp2: c.unitStamp2 || null,
        visibility: c.visibility || "PUBLIC",
        stats: {
          pending: pendingMap[String(c._id)] || 0,
          approved: approvedMap[String(c._id)] || 0,
          completed: completedMap[String(c._id)] || 0,
          issued: issuedCount,
        },
      };
    });

    return NextResponse.json({
      deputy: {
        name: deputy.name,
        number: deputy.number,
        units: deputy.units || [],
      },
      courses: coursesData,
    });
  } catch (err) {
    console.error("Dashboard deputy error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
