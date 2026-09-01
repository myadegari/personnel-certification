import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import Course from "@/models/Course";
import Enrollment, { LIVE_ENROLLMENT_FILTER } from "@/models/Enrollment";
import Indicator from "@/models/Indicator";
import IndicatorUsage from "@/models/IndicatorUsage";
import { requireVerified } from "@/lib/authGuard";
import { ROLES } from "@/lib/roles";

const ISSUE_SEQ_MAX = 999;

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
      .populate("headedDeputy", "name number")
      .lean();

    if (!user?.headedDeputy) {
      return NextResponse.json(
        { error: "برای شما معاونتی تعیین نشده است." },
        { status: 400 }
      );
    }

    const deputy = user.headedDeputy;

    const courses = await Course.find({ deputy: deputy._id })
      .sort({ date: -1 })
      .lean();

    const courseIds = courses.map((c) => c._id);

    // Per-course aggregate enrollment stats (from the enrollments collection).
    const indicatorDocs = await Indicator.find({
      pattern: { $in: courseIds.map((c) => `CERT-C${c._id}`) },
    })
      .select("pattern lastNumber")
      .lean();

    // IndicatorUsage.indicator references the Indicator document, NOT the
    // course id; map each indicator _id back to its owning course.
    const courseByIndicatorId = Object.fromEntries(
      indicatorDocs.map((i) => [String(i._id), i.pattern.replace(/^CERT-C/, "")])
    );
    const indicatorIds = indicatorDocs.map((i) => i._id);

    const [pendingCounts, approvedCounts, completedCounts, usageCounts] =
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
        IndicatorUsage.aggregate([
          { $match: { indicator: { $in: indicatorIds } } },
          { $group: { _id: "$indicator", count: { $sum: 1 } } },
        ]),
      ]);

    const countMap = (arr) => Object.fromEntries(arr.map((x) => [String(x._id), x.count]));
    const pendingMap = countMap(pendingCounts);
    const approvedMap = countMap(approvedCounts);
    const completedMap = countMap(completedCounts);
    const usageMap = countMap(usageCounts);
    // Map from course _id (string) to indicator _id for issue counting.
    const indicatorIdByCourse = Object.fromEntries(
      indicatorDocs.map((i) => [i.pattern.replace(/^CERT-C/, ""), i._id])
    );

    const coursesData = courses.map((c) => {
      const issueIndicatorId = indicatorIdByCourse[String(c._id)];
      const issuedCount = issueIndicatorId ? usageMap[String(issueIndicatorId)] || 0 : completedMap[String(c._id)] || 0;
      return {
        _id: c._id,
        name: c.name,
        courseCode: c.courseCode,
        courseSeq: c.courseSeq ?? null,
        date: c.date,
        enrollmentDeadline: c.enrollmentDeadline || c.date + 86399,
        duration: c.duration,
        organizingUnit: c.organizingUnit,
        stats: {
          pending: pendingMap[String(c._id)] || 0,
          approved: approvedMap[String(c._id)] || 0,
          completed: completedMap[String(c._id)] || 0,
          issued: issuedCount,
        },
        issueProgress: { issued: issuedCount, max: ISSUE_SEQ_MAX },
      };
    });

    // Certificates issued for this deputy's courses (completed enrollments).
    const certificates = await Enrollment.find({
      course: { $in: courseIds },
      status: "APPROVED",
      certificateStatus: "completed",
      ...LIVE_ENROLLMENT_FILTER,
    })
      .populate("user", "firstName lastName nationalId personnelNumber")
      .populate("course", "name courseSeq")
      .sort({ issuedAt: -1 })
      .limit(200)
      .lean();

    return NextResponse.json({
      deputy: { name: deputy.name, number: deputy.number },
      courses: coursesData,
      certificates: certificates.map((e) => ({
        enrollmentId: e._id,
        user: e.user,
        courseName: e.course?.name,
        courseSeq: e.course?.courseSeq ?? null,
        certificateUniqueId: e.certificateUniqueId,
        certificateUrl: e.certificateUrl,
        issuedAt: e.issuedAt,
        certificateStatus: e.certificateStatus,
      })),
    });
  } catch (err) {
    console.error("Dashboard deputy error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
