'use client';
import CoursesClient from "@/components/admin/CoursesClient";
// import Link from 'next/link';
import axios from 'axios';
// import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

const getCourses = async () => {
  const { data } = await axios.get('/api/admin/courses');
  return data;
};

export default function CoursesManagementPage() {
  const { data: courses, isLoading, error } = useQuery({ 
    queryKey: ['adminCourses'], // یک کلید یکتا برای این کوئری
    queryFn: getCourses,
  });


  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">مدیریت دوره‌ها</h1>
      </div>
      {isLoading && <Skeleton className="w-full h-[300px]" />}
      {error && <p className="text-red-500">خطا در بارگذاری دوره‌ها: {error.message}</p>}
      {courses && <CoursesClient initialCourses={courses} />}
    </div>
  );
}
