// File: app/api/profile/route.js
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import Course from "@/models/Course";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });

  await dbConnect();
  const user = await User.findById(session.user.id).select('-password -resetPasswordToken -resetPasswordExpires').lean();
  if (!user) return new Response(JSON.stringify({ message: "User not found" }), { status: 404 });
  delete user.profileImage;

  // Number of courses where this user is a signatory (first or second). The
  // user sidebar uses it to decide whether to show the "courses I sign" item.
  const signatoryCourseCount = await Course.countDocuments({
    $or: [{ signatory: session.user.id }, { signatory2: session.user.id }],
  });
  user.signatoryCourseCount = signatoryCourseCount;

  return new Response(JSON.stringify(user), { status: 200 });
}
