// File: app/profile/page.jsx
import { getServerSession } from "next-auth";
import { authOptions } from "../../api/auth/[...nextauth]/route";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import ProfileForm from "@/components/ProfileForm";
import ChangePasswordForm from "@/components/ChangePasswordForm";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import UserSignature from "@/components/UserSignature";

async function getUserData(userId) {
  await dbConnect();
  const user = await User.findById(userId).select('-password').lean();
  // Convert non-serializable data like _id
  return JSON.parse(JSON.stringify(user));
}

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  const user = await getUserData(session.user.id);

  return (
    <div>
      {/* --- بخش جدید: هدر صفحه --- */}
      
      {/* --- پایان بخش جدید --- */}

      <div className="grid gap-4 md:grid-cols-8 max-md:px-4">
        <div className="md:col-span-6 md:col-start-2">
          {/* <h2 className="text-xl font-semibold mb-4 ">ویرایش اطلاعات</h2> */}
          <ProfileForm user={user} />
        </div>
        <div className="md:col-span-3 md:row-start-2 md:col-start-2">
          {/* <h2 className="text-xl font-semibold mb-4">تغییر رمز عبور</h2> */}
          <ChangePasswordForm />
        </div>
        <div className="md:col-span-3 md:row-start-2">
          <UserSignature user={user}/>
        </div>
      </div>
    </div>
  );
}
`
<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold text-gray-800">پروفایل کاربری</h1>
        {/* <Link href="/dashboard" passHref>
          <Button variant="outline">بازگشت به داشبورد</Button>
        </Link> */}
      </div>
`