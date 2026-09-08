import EnrollmentsClient from "@/components/admin/EnrollmentsClient";
import Link from 'next/link';
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/admin/ui/PageHeader";
import { ArrowRight } from "reicon-react";

const getBaseUrl = () => {
  if (typeof window === 'undefined') {
    return process.env.INTERNAL_API_URL || 'http://localhost:3000';
  }
  return '';
};

async function getEnrollmentData(courseId, page = 1) {
  const cookie = (await headers()).get("cookie");
  try {
    const res = await fetch(
      `${getBaseUrl()}/api/admin/courses/${courseId}/enrollments?page=${page}`,
      { headers: { Cookie: cookie }, cache: "no-store" }
    );
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return { kind: "ok", data: await res.json() };
  } catch (error) {
    const status = error.status;
    console.error("Failed to fetch enrollment data:", error.message);
    if (status === 401 || status === 403) return { kind: "unauthorized" };
    if (status === 404) return { kind: "notFound" };
    return { kind: "error" };
  }
}

function BackToCourses() {
  return (
    <Button asChild variant="outline" className="cursor-pointer">
      <Link href="/admin/courses">
        <ArrowRight className="h-4 w-4" /> بازگشت به دوره‌ها
      </Link>
    </Button>
  );
}

export default async function CourseEnrollmentsPage({ params }) {
  const { id: courseId } = await params;
  const result = await getEnrollmentData(courseId);

  if (result.kind === "unauthorized") {
    redirect("/authentication/login");
  }

  if (result.kind === "notFound") {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <p className="text-lg font-medium">دوره مورد نظر یافت نشد.</p>
        <BackToCourses />
      </div>
    );
  }

  if (result.kind === "error") {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <p className="text-lg font-medium">خطا در بارگذاری اطلاعات ثبت‌نام‌ها.</p>
        <BackToCourses />
      </div>
    );
  }

  const initialData = result.data;

  return (
    <div>
      <PageHeader
        title="مدیریت ثبت‌نام‌ها"
        description={`دوره: ${initialData.course.name}`}
        actions={<BackToCourses />}
      />
      <EnrollmentsClient initialData={initialData} courseId={courseId} />
    </div>
  );
}
