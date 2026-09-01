// File: app/dashboard/courses/page.jsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../api/auth/[...nextauth]/route";
import dbConnect from "@/lib/dbConnect";
import Course from "@/models/Course";
import Enrollment from "@/models/Enrollment";
import CourseList from "@/components/CourseList";

export default async function CoursesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/authentication/login");

  await dbConnect();

  const [courseDocs, userEnrollments, approvedAgg] = await Promise.all([
    // Deputy-owned courses (visibility: "DEPUTY") are private to the deputy
    // head: they never surface in the public catalog.
    Course.find(
      { visibility: { $ne: "DEPUTY" } },
      {
        name: 1,
        date: 1,
        duration: 1,
        organizingUnit: 1,
        enrollmentDeadline: 1,
        enrollmentLimit: 1,
        courseCode: 1,
      }
    )
      .sort({ date: -1 })
      .lean(),
    Enrollment.find({ user: session.user.id }).select("course status -_id").lean(),
    Enrollment.aggregate([
      { $match: { status: "APPROVED" } },
      { $group: { _id: "$course", n: { $sum: 1 } } },
    ]),
  ]);

  const initialCourses = courseDocs.map((c) => ({
    _id: c._id.toString(),
    name: c.name,
    date: c.date,
    duration: c.duration,
    organizingUnit: c.organizingUnit,
    enrollmentDeadline: c.enrollmentDeadline ?? null,
    enrollmentLimit: c.enrollmentLimit ?? null,
    courseCode: c.courseCode ?? null,
  }));

  // Plain objects (not Map) so they serialize across the server/client boundary.
  const enrollmentMap = {};
  for (const e of userEnrollments) {
    enrollmentMap[e.course.toString()] = e.status;
  }

  const approvedCounts = {};
  for (const row of approvedAgg) {
    approvedCounts[row._id.toString()] = row.n;
  }

  return (
    <CourseList
      initialCourses={initialCourses}
      enrollmentMap={enrollmentMap}
      approvedCounts={approvedCounts}
    />
  );
}
