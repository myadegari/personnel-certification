import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import dbConnect from "@/lib/dbConnect";
import Enrollment from "@/models/Enrollment";
import Course from "@/models/Course";


export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new Response(JSON.stringify({ message: "ابتدا وارد شوید." }), { status: 401 });
  }

  try {
    const { courseId } = await request.json();
    if (!courseId) {
      return new Response(JSON.stringify({ message: "شناسه دوره الزامی است." }), { status: 400 });
    }

    await dbConnect();

     // --- Validation Logic Start ---

     const course = await Course.findById(courseId);
     if (!course) {
         return new Response(JSON.stringify({ message: "دوره مورد نظر یافت نشد." }), { status: 404 });
     }
 
     // 1. Check registration deadline
     // The deadline is either a custom deadline set by an admin, or the end of the day after the course start date.
     // The extra 86399 seconds make the deadline 23:59:59 on the day after the course date.
     const deadline = course.enrollmentDeadline || (course.date + 86399); 
     const now = Math.floor(Date.now() / 1000); // Current time in seconds
 
     if (now > deadline) {
          return new Response(JSON.stringify({ message: "مهلت ثبت‌نام این دوره به پایان رسیده است." }), { status: 403 });
     }
 
     // 2. Check enrollment limit (if it exists)
     if (course.enrollmentLimit && course.enrollmentLimit > 0) {
       const approvedEnrollmentsCount = await Enrollment.countDocuments({
         course: courseId,
         status: 'APPROVED',
       });
 
       if (approvedEnrollmentsCount >= course.enrollmentLimit) {
          return new Response(JSON.stringify({ message: "ظرفیت این دوره تکمیل شده است." }), { status: 403 });
       }
     }
 
     // --- Validation Logic End ---
    // Check if user is already enrolled
    const existingEnrollment = await Enrollment.findOne({
      user: session.user.id,
      course: courseId,
    });

    if (existingEnrollment) {
      return new Response(JSON.stringify({ message: "شما قبلاً در این دوره ثبت‌نام کرده‌اید." }), { status: 409 });
    }

    // Create new enrollment request
    await Enrollment.create({
      user: session.user.id,
      course: courseId,
      status: 'PENDING',
      metadata:{
        courseStatus:"EXIST"
      }
    });

    return new Response(JSON.stringify({ message: "درخواست ثبت‌نام شما با موفقیت ارسال شد." }), { status: 201 });

  } catch (error) {
    console.error("Enrollment Error:", error);
    return new Response(JSON.stringify({ message: "خطای سرور." }), { status: 500 });
  }
}