// File: app/dashboard/profile/page.jsx
import { getServerSession } from "next-auth";
import { authOptions } from "../../api/auth/[...nextauth]/route";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import ProfileSummary from "@/components/ProfileSummary";
import ChangePasswordForm from "@/components/ChangePasswordForm";

async function getUserData(userId) {
  await dbConnect();
  const user = await User.findById(userId).select('-password -resetPasswordToken -resetPasswordExpires').lean();
  return JSON.parse(JSON.stringify(user));
}

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  const user = await getUserData(session.user.id);

  return (
    <div className="grid gap-4 md:grid-cols-8 max-md:px-4">
      <div className="md:col-span-5">
        <ProfileSummary user={user} />
      </div>
      <div className="md:col-span-3">
        <ChangePasswordForm />
      </div>
    </div>
  );
}
