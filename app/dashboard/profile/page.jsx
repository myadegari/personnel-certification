// File: app/dashboard/profile/page.jsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "../../api/auth/[...nextauth]/route";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import ProfileSummary from "@/components/ProfileSummary";
import ChangePasswordForm from "@/components/ChangePasswordForm";
import PageHeader from "@/components/admin/ui/PageHeader";

async function getUserData(userId) {
  await dbConnect();
  const user = await User.findById(userId)
    .select('-password -resetPasswordToken -resetPasswordExpires')
    .lean();
  return JSON.parse(JSON.stringify(user));
}

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/authentication/login");

  const user = await getUserData(session.user.id);
  if (!user) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <PageHeader
        title="پروفایل کاربری"
        description="مشاهده اطلاعات حساب و تغییر رمز عبور"
      />

      <div className="grid gap-4 lg:grid-cols-8">
        <div className="lg:col-span-5">
          <ProfileSummary user={user} />
        </div>
        <div className="lg:col-span-3">
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
}
