// File: app/dashboard/courses/page.jsx
'use server'; // You can add server actions in the same file as a Server Component

import { getServerSession } from "next-auth";
import { authOptions } from "../../api/auth/[...nextauth]/route";
import dbConnect from "@/lib/dbConnect";
import Course from "@/models/Course";
import Enrollment from "@/models/Enrollment";
import { unstable_noStore as noStore } from 'next/cache';
import CourseList from "@/components/CourseList"; // We will create this component next

const COURSES_PER_PAGE = 9; // Number of courses to fetch per page

/**
 * Server Action to fetch paginated courses.
 * This function will be called by the client to load more courses.
 */
export async function fetchCourses({ page = 1 }) {
  noStore(); // Opt out of caching for dynamic data
  try {
    await dbConnect();
    const courses = await Course.find({})
      .sort({ date: -1 }) // Newest courses first
      .skip((page - 1) * COURSES_PER_PAGE)
      .limit(COURSES_PER_PAGE)
      .lean();
    
    // Important: Convert MongoDB ObjectId to string for client-side usage
    return courses.map(course => ({
      name: course.name,
      date: course.date,
      enrollmentDeadline: course.enrollmentDeadline,
      duration: course.duration,
      organizingUnit: course.organizingUnit,
      _id: course._id.toString(),
      // Ensure other ObjectId fields are converted if they will be used on the client
    }));

  } catch (error) {
    console.error('Failed to fetch courses:', error);
    return [];
  }
}

export default async function CoursesPage() {
  const session = await getServerSession(authOptions);
  
  // Fetch the initial data (first page of courses and all user enrollments)
  const initialCourses = await fetchCourses({ page: 1 });
  const userEnrollments = await Enrollment.find({ user: session.user.id }).select('course status -_id').lean();
  
  // Create a map for quick lookup of enrollment status
  const enrollmentMap = new Map(userEnrollments.map(e => [e.course.toString(), e.status]));

  return (
    <div>
      {/* <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold text-gray-800">لیست دوره‌های آموزشی</h1>
      </div> */}

      {/* Pass initial data to the client component */}
      <CourseList 
        initialCourses={initialCourses} 
        enrollmentMap={enrollmentMap} 
      />
    </div>
  );
}