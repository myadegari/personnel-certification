// File: app/admin/page.jsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import Course from "@/models/Course";
import Enrollment from "@/models/Enrollment";

// This is a Server Component, so we can fetch data directly
// export const dynamic = 'force-dynamic';

async function getStats() {
  await dbConnect();
  const userCount = await User.countDocuments();
  const courseCount = await Course.countDocuments();
  const pendingEnrollments = await Enrollment.countDocuments({ status: 'PENDING' });
  return { userCount, courseCount, pendingEnrollments };
}

export default async function AdminDashboardPage() {
  const { userCount, courseCount, pendingEnrollments } = await getStats();

  return (
    <div className="pt-4">
      <h1 className="text-3xl font-bold mb-6">داشبورد مدیریت</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              تعداد کل کاربران
            </CardTitle>
            {/* You can add an icon here */}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              تعداد کل دوره‌ها
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{courseCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              ثبت‌نام‌های در انتظار تایید
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingEnrollments}</div>
            <p className="text-xs text-muted-foreground">
              نیاز به بررسی و اقدام دارد
            </p>
          </CardContent>
        </Card>
      </div>
      {/* You can add more components here, like recent activity or charts */}
    </div>
  );
}
