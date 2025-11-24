import EnrollmentsClient from "@/components/admin/EnrollmentsClient";
import Link from 'next/link';
import axios from "axios";
import { Button } from "@/components/ui/button";
const NEXTJS_APP_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

async function getEnrollmentData(courseId, page = 1) {
  try {
    const res = await axios.get(`/api/admin/courses/${courseId}/enrollments?page=${page}`);
    if (res.status !== 200) throw new Error('Failed to fetch data');
    return res.data;
  } catch (error) {
    console.error(error);
    return { course: null, enrollments: [], pagination: {} };
  }
}

export default async function CourseEnrollmentsPage({ params }) {
  const { id: courseId } = await params;
  const initialData = await getEnrollmentData(courseId);

  if (!initialData.course) {
    return <div>دوره مورد نظر یافت نشد.</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">مدیریت ثبت‌نام‌ها</h1>
          <p className="text-muted-foreground">دوره: {initialData.course.name}</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/courses">بازگشت به لیست دوره‌ها</Link>
        </Button>
      </div>
      <EnrollmentsClient initialData={initialData} courseId={courseId} />
    </div>
  );
}
