'use client';
import CoursesClient from "@/components/admin/CoursesClient";
import { internalAxios } from '@/lib/axios';
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/admin/ui/PageHeader";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

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
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-xl shimmer" />
          ))}
        </div>
      )}
      {error && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <AlertTriangle className="size-8 text-rose-500" />
          <p className="text-sm text-muted-foreground">خطا در بارگذاری دوره‌ها.</p>
          <Button size="sm" variant="outline" className="cursor-pointer" onClick={() => refetch()}>تلاش مجدد</Button>
        </div>
      )}
      {courses && <CoursesClient initialCourses={courses} />}
    </div>
  );
}
