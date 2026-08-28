// File: app/api/profile/route.js
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });

  await dbConnect();
  const user = await User.findById(session.user.id).select('-password -resetPasswordToken -resetPasswordExpires').lean();
  if (!user) return new Response(JSON.stringify({ message: "User not found" }), { status: 404 });
  delete user.profileImage;

  return new Response(JSON.stringify(user), { status: 200 });
}
