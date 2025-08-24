import EnrollmentsClient from "@/components/admin/EnrollmentsClient";
import Link from 'next/link';
import { Button } from "@/components/ui/button";

async function getEnrollmentData(courseId, page = 1) {
  try {
    const res = await fetch(`${process.env.NEXTAUTH_URL}/api/admin/courses/${courseId}/enrollments?page=${page}`, {
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('Failed to fetch data');
    return res.json();
  } catch (error) {
    console.error(error);
    return { course: null, enrollments: [], pagination: {} };
  }
}

export default async function CourseEnrollmentsPage({ params }) {
  const { id: courseId } = params;
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
