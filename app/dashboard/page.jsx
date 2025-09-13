import { getServerSession } from "next-auth/next";
import { authOptions } from "../api/auth/[...nextauth]/route";
import dbConnect from "@/lib/dbConnect";
import Enrollment from "@/models/Enrollment";
import {internalAxios} from '@/lib/axios'; // <-- Use the main axios library for server-side
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import UserCoursesTable from "@/components/UserCoursesTable";
import { headers } from "next/headers"; // <-- این را import کنید
import Logout from "@/components/Logout";
import clsx from "clsx";


// This function now gets the totals for the stat cards
async function getDashboardStats(userId) {
  await dbConnect();
  const enrollments = await Enrollment.find({ user: userId, status: 'APPROVED' }).populate('course', 'duration').lean();
  const totalCourses = enrollments.length;
  const totalHours = enrollments.reduce((acc, curr) => acc + (curr.course?.duration || 0), 0);
  return { totalCourses, totalHours };
}

// This function gets the initial data for the first page of the table
async function getInitialCourses() {
  // --- این بخش اصلاح شده است ---
  const headersList = await headers();
  const cookie = headersList.get('cookie');
  
  try {
    // Use axios for the server-side fetch, passing the cookie for authentication
    const { data } = await internalAxios.get(`/my-courses?page=1&limit=5`, {
      headers: { 'Cookie': cookie },
    });
    return data;
  } catch (error) {
    console.error("Failed to fetch initial courses:", error.message);
    return { enrollments: [], pagination: { pageCount: 0, currentPage: 1 } };
  }
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) return <p>لطفا وارد شوید.</p>;

  // Fetch stats and initial table data in parallel
  const [stats, initialCoursesData] = await Promise.all([
    getDashboardStats(session.user.id),
    getInitialCourses()
  ]);

  return (
<div className=" relative">
<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold text-gray-800">داشبورد کاربری</h1>
        {/* <div className="flex gap-4">
          <Link href="/profile" passHref><Button variant="outline" className="cursor-pointer">پروفایل کاربری</Button></Link>
          <Link href="/courses" passHref><Button className="cursor-pointer">مشاهده و ثبت‌نام دوره‌ها</Button></Link>
          <Logout/>
        </div> */}
      </div>
      {session?.user?.status === 'NEED_TO_VERIFY' && (
      <div className="grid place-content-center justify-items-center h-full absolute mx-auto w-full z-10">
      <Card className="w-full max-w-md p-0 shadow-xl bg-transparent">
                <CardContent className="p-0 bg-transparent">
                    
                        <div className="text-center p-4 bg-yellow-200/75 text-yellow-800 rounded-md bg-opacity-5">
                            <h3 className="font-bold">حساب کاربری در انتظار تایید است</h3>
                            <p className="text-sm mt-2">
                                حساب کاربری شما با موفقیت ایجاد شده و در حال حاضر منتظر تایید توسط مدیر سیستم می‌باشد.
                                پس از تایید، به تمامی امکانات دسترسی خواهید داشت.
                            </p>
                        </div>
                    

                    {/* {session?.user?.status === 'VERIFIED' && (
                        <div className="text-center p-4 bg-green-100 text-green-800 rounded-md">
                             <h3 className="font-bold">حساب کاربری شما فعال است</h3>
                            <p className="text-sm mt-2">
                                شما می‌توانید از تمام امکانات سامانه استفاده کنید.
                            </p>
                        </div>
                    )} */}
                </CardContent>
            </Card>
            </div>
  )}

  <div className={clsx({"w-full h-full blur-sm z-0":session?.user?.status != 'VERIFIED'})}>
   
      <h2 className="text-xl font-semibold mb-4 text-gray-700">آمار کلی</h2>
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader><CardTitle>تعداد دوره‌های گذرانده</CardTitle></CardHeader>
          <CardContent><p className="text-4xl font-bold text-blue-600">{stats.totalCourses}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>مجموع ساعات آموزشی</CardTitle></CardHeader>
          <CardContent><p className="text-4xl font-bold text-blue-600">{stats.totalHours} ساعت</p></CardContent>
        </Card>
      </div>
      
      <h2 className="text-xl font-semibold mb-4 text-gray-700">دوره‌های من (تایید شده)</h2>
      <UserCoursesTable initialData={initialCoursesData} />
      </div>
</div>
    );
}
