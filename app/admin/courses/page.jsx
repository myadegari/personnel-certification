import CoursesClient from "@/components/admin/CoursesClient";
import Link from 'next/link';
import axios from 'axios';
import { Button } from "@/components/ui/button";

async function getCourses() {
  try {
    // Fetching from the absolute URL is important in Server Components
    
    const res = await axios.get(`${process.env.NEXTAUTH_URL}/api/admin/courses`);
    if (res.status !== 200) return []; // Corrected the condition to use !==
    return res.data;
  } catch (error) {
    console.error("Failed to fetch courses:", error);
    return [];
  }
}

export default async function CoursesManagementPage() {
  const initialCourses = await getCourses();

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">مدیریت دوره‌ها</h1>
      </div>
      <CoursesClient initialCourses={initialCourses} />
    </div>
  );
}
