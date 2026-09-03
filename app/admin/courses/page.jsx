'use client';
import CoursesClient from "@/components/admin/CoursesClient";
import { internalAxios } from '@/lib/axios';
import { useQuery } from "@tanstack/react-query";
import PageHeader from "@/components/admin/ui/PageHeader";

const getCourses = async () => {
  const { data } = await internalAxios.get('/admin/courses');
  return data;
};

export default function CoursesManagementPage() {
  const { data: courses, isLoading, error, refetch } = useQuery({
    queryKey: ['adminCourses'],
    queryFn: getCourses,
  });

  return (
    <div>
      <PageHeader title="مدیریت دوره‌ها" description="ایجاد، ویرایش و مدیریت دوره‌های آموزشی" />
      <CoursesClient
        initialCourses={courses}
        isLoading={isLoading}
        isError={!!error}
        onRetry={() => refetch()}
      />
    </div>
  );
}
