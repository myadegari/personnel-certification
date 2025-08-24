// File: app/courses/page.jsx
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import dbConnect from "@/lib/dbConnect";
import Course from "@/models/Course";
import Enrollment from "@/models/Enrollment";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import EnrollButton from "@/components/EnrollButton";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";

// Fetch all necessary data on the server
async function getCourseData(userId) {
  await dbConnect();
  const courses = await Course.find({}).sort({ date: -1 }).lean();
  const userEnrollments = await Enrollment.find({ user: userId }).select('course status -_id').lean();
  
  const enrollmentMap = new Map(userEnrollments.map(e => [e.course.toString(), e.status]));

  return { courses, enrollmentMap };
}

export default async function CoursesPage() {
  const session = await getServerSession(authOptions);
  const { courses, enrollmentMap } = await getCourseData(session.user.id);

  return (
    <div>
      {/* --- بخش جدید: هدر صفحه --- */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold text-gray-800">لیست دوره‌های آموزشی</h1>
        <Link href="/dashboard" passHref>
          <Button variant="outline">بازگشت به داشبورد</Button>
        </Link>
      </div>
      {/* --- پایان بخش جدید --- */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course) => {
          const enrollmentStatus = enrollmentMap.get(course._id.toString());
          return (
            <Card key={course._id} className="flex flex-col">
              <CardHeader>
                <CardTitle>{course.name}</CardTitle>
                <CardDescription>{course.organizingUnit}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <p><strong>تاریخ برگزاری:</strong> {new DateObject({date:new Date(course.date*1000),calendar: persian, locale: persian_fa }).format()}</p>
                <p><strong>مدت زمان:</strong> {course.duration} ساعت</p>
              </CardContent>
              <CardFooter>
                <EnrollButton courseId={course._id.toString()} status={enrollmentStatus} />
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
