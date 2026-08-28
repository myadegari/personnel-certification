import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import Course from "@/models/Course";
import Enrollment from "@/models/Enrollment";
import { requireAdmin } from "@/lib/authGuard";

function monthKeys(count) {
  const keys = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: new Intl.DateTimeFormat("fa-IR", { month: "short", year: "numeric" }).format(d),
    });
  }
  return keys;
}

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    await dbConnect();

    const [userCount, courseCount, enrollmentCount, pendingEnrollments, certificatesIssued] =
      await Promise.all([
        User.countDocuments(),
        Course.countDocuments(),
        Enrollment.countDocuments(),
        Enrollment.countDocuments({ status: "PENDING" }),
        Enrollment.countDocuments({ certificateUrl: { $nin: [null, ""] } }),
      ]);

    const months = monthKeys(6);
    const since = new Date();
    since.setMonth(since.getMonth() - 5);
    since.setDate(1);

    const [enrollByMonth, statusAgg, topCourses] = await Promise.all([
      Enrollment.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
            count: { $sum: 1 },
          },
        },
      ]),
      Enrollment.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Enrollment.aggregate([
        { $group: { _id: "$course", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: "courses",
            localField: "_id",
            foreignField: "_id",
            as: "course",
          },
        },
        { $unwind: "$course" },
        { $project: { _id: 0, name: "$course.name", count: 1 } },
      ]),
    ]);

    const monthMap = Object.fromEntries(enrollByMonth.map((m) => [m._id, m.count]));
    const timeseries = months.map((m) => ({ label: m.label, count: monthMap[m.key] || 0 }));

    const statusLabels = { PENDING: "در انتظار", APPROVED: "تایید شده", REJECTED: "رد شده" };
    const statusBreakdown = statusAgg.map((s) => ({
      name: statusLabels[s._id] || s._id,
      value: s.count,
    }));

    const [recentEnrollments, recentUsers] = await Promise.all([
      Enrollment.find()
        .sort({ createdAt: -1 })
        .limit(6)
        .populate("user", "firstName lastName")
        .populate("course", "name")
        .lean(),
      User.find()
        .sort({ createdAt: -1 })
        .limit(4)
        .select("firstName lastName role createdAt")
        .lean(),
    ]);

    const activity = [
      ...recentEnrollments.map((e) => ({
        type: "enrollment",
        createdAt: e.createdAt,
        title: `${e.user?.firstName || ""} ${e.user?.lastName || ""}`.trim() || "کاربر",
        detail: `ثبت‌نام در «${e.course?.name || "دوره"}»`,
      })),
      ...recentUsers.map((u) => ({
        type: "user",
        createdAt: u.createdAt,
        title: `${u.firstName} ${u.lastName}`,
        detail: "کاربر جدید ایجاد شد",
      })),
    ]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 8);

    return NextResponse.json({
      stats: { userCount, courseCount, enrollmentCount, pendingEnrollments, certificatesIssued },
      timeseries,
      statusBreakdown,
      topCourses,
      activity,
    });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
