'use client';
import CoursesClient from "@/components/admin/CoursesClient";
import { internalAxios } from '@/lib/axios';
import { useQuery } from "@tanstack/react-query";

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
    <CoursesClient
      initialCourses={courses}
      isLoading={isLoading}
      isError={!!error}
      onRetry={() => refetch()}
    />
  );
}
