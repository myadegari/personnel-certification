import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import bcrypt from "bcrypt";

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });

  const { currentPassword, newPassword } = await request.json();
  
  await dbConnect();
  const user = await User.findById(session.user.id);

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    return new Response(JSON.stringify({ message: "رمز عبور فعلی اشتباه است." }), { status: 400 });
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  return new Response(JSON.stringify({ message: "رمز عبور با موفقیت تغییر کرد." }), { status: 200 });
}