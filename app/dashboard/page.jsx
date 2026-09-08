import { getServerSession } from "next-auth/next";
import { authOptions } from "../api/auth/[...nextauth]/route";
import dbConnect from "@/lib/dbConnect";
import Enrollment, { LIVE_ENROLLMENT_FILTER } from "@/models/Enrollment";
import Course from "@/models/Course";
import GuestCertificate from "@/models/GuestCertificate";
import { headers } from "next/headers";
import { ROLES } from "@/lib/roles";
import DashboardClient from "@/components/dashboard/DashboardClient";

// Totals for the dashboard stat cards.
async function getDashboardStats(userId) {
  await dbConnect();
  const enrollments = await Enrollment.find({
    user: userId,
    status: "APPROVED",
    ...LIVE_ENROLLMENT_FILTER,
  })
    .populate("course", "duration")
    .lean();
  const totalCourses = enrollments.length;
  const totalHours = enrollments.reduce(
    (acc, curr) => acc + (curr.course?.duration || 0),
    0
  );
  const [pendingCount, certificatesIssued] = await Promise.all([
    Enrollment.countDocuments({
      user: userId,
      status: "PENDING",
      ...LIVE_ENROLLMENT_FILTER,
    }),
    Enrollment.countDocuments({
      user: userId,
      status: "APPROVED",
      certificateStatus: "completed",
      ...LIVE_ENROLLMENT_FILTER,
    }),
  ]);
  return { totalCourses, totalHours, pendingCount, certificatesIssued };
}

// Initial data for the first page of the "my courses" table.
async function getInitialCourses() {
  const cookie = (await headers()).get("cookie");
  try {
    // Absolute URL: the Node server runtime cannot resolve the relative "/api"
    // baseURL used by the client-side axios instance.
    const base = process.env.INTERNAL_API_URL || "http://localhost:3000";
    const res = await fetch(`${base}/api/my-courses?page=1&limit=5`, {
      headers: { Cookie: cookie },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    console.error("Failed to fetch initial courses:", error.message);
    return { enrollments: [], pagination: { pageCount: 0, currentPage: 1 } };
  }
}

// Courses the user signs (first or second) + certificates issued for them.
async function getSignatorySummary(userId) {
  await dbConnect();
  const courses = await Course.find({
    $or: [{ signatory: userId }, { signatory2: userId }],
  })
    .select("_id")
    .lean();
  const courseIds = courses.map((c) => c._id);
  const [enrollCount, guestCount] = courseIds.length
    ? await Promise.all([
        Enrollment.countDocuments({
          course: { $in: courseIds },
          status: "APPROVED",
          certificateStatus: "completed",
          ...LIVE_ENROLLMENT_FILTER,
        }),
        GuestCertificate.countDocuments({
          course: { $in: courseIds },
          certificateStatus: "completed",
        }),
      ])
    : [0, 0];
  return { courses: courseIds.length, certificates: enrollCount + guestCount };
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) return <p>لطفا وارد شوید.</p>;

  const [stats, initialCoursesData, signatory] = await Promise.all([
    getDashboardStats(session.user.id),
    getInitialCourses(),
    getSignatorySummary(session.user.id),
  ]);

  const firstName = session.user.name?.trim()?.split(/\s+/)[0] || "کاربر";
  // Deputy heads see their signed courses folded into "معاونت من"; everyone
  // else uses the standalone read-only signatory view.
  const signatoryHref =
    session.user.role === ROLES.DEPUTY_HEAD ? "/dashboard/deputy" : "/dashboard/signatory";

  return (
    <DashboardClient
      stats={stats}
      initialCoursesData={initialCoursesData}
      signatory={signatory}
      signatoryHref={signatoryHref}
      user={{ firstName, status: session.user.status }}
    />
  );
}
