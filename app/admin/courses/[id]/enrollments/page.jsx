import EnrollmentsClient from "@/components/admin/EnrollmentsClient";
import Link from 'next/link';
import axios from "axios";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/admin/ui/PageHeader";
import { ArrowRight } from "lucide-react";

const getBaseUrl = () => {
  if (typeof window === 'undefined') {
    return process.env.INTERNAL_API_URL || 'http://localhost:3000';
  }
  return '';
};

async function getEnrollmentData(courseId, page = 1) {
  try {
    const res = await axios.get(`${getBaseUrl()}/api/admin/courses/${courseId}/enrollments?page=${page}`);
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
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <p className="text-lg font-medium">دوره مورد نظر یافت نشد.</p>
        <Button asChild variant="outline" className="cursor-pointer">
          <Link href="/admin/courses">بازگشت به دوره‌ها</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="مدیریت ثبت‌نام‌ها"
        description={`دوره: ${initialData.course.name}`}
        actions={
          <Button asChild variant="outline" className="cursor-pointer">
            <Link href="/admin/courses">
              <ArrowRight className="h-4 w-4" /> بازگشت به دوره‌ها
            </Link>
          </Button>
        }
      />
      <EnrollmentsClient initialData={initialData} courseId={courseId} />
    </div>
  );
}
