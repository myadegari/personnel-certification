import { getServerSession } from "next-auth/next";
import { authOptions } from "../api/auth/[...nextauth]/route";
import dbConnect from "@/lib/dbConnect";
import Enrollment, { LIVE_ENROLLMENT_FILTER } from "@/models/Enrollment";
import axios from "axios";
import { headers } from "next/headers";
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
    // Absolute URL: axios (and fetch) cannot resolve the relative "/api"
    // baseURL from lib/axios inside the Node server runtime.
    const base = process.env.INTERNAL_API_URL || "http://localhost:3000";
    const { data } = await axios.get(`${base}/api/my-courses?page=1&limit=5`, {
      headers: { Cookie: cookie },
    });
    return data;
  } catch (error) {
    console.error("Failed to fetch initial courses:", error.message);
    return { enrollments: [], pagination: { pageCount: 0, currentPage: 1 } };
  }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) return <p>لطفا وارد شوید.</p>;

  const [stats, initialCoursesData] = await Promise.all([
    getDashboardStats(session.user.id),
    getInitialCourses(),
  ]);

  const firstName = session.user.name?.trim()?.split(/\s+/)[0] || "کاربر";

  return (
    <DashboardClient
      stats={stats}
      initialCoursesData={initialCoursesData}
      user={{ firstName, status: session.user.status }}
    />
  );
}
