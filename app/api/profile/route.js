// File: app/api/profile/route.js
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";

// GET function remains the same...

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });

  await dbConnect();
  const user = await User.findById(session.user.id).select('-password -resetPasswordToken -resetPasswordExpires').lean();
  if (!user) return new Response(JSON.stringify({ message: "User not found" }), { status: 404 });

  return new Response(JSON.stringify(user), { status: 200 });
}
// UPDATE THE PUT FUNCTION
export async function PUT(request) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });

  try {
    // Now accepting image URLs along with other data
    const { firstName, lastName, email,position, profileImage, signatureImage } = await request.json();
    
    // Build the update object dynamically
    const updateData = {
      firstName,
      lastName,
      email,
      position
    };

    // Only add image URLs if they are provided
    if (profileImage) updateData.profileImage = profileImage;
    if (signatureImage) updateData.signatureImage = signatureImage;
    
    await dbConnect();
    const updatedUser = await User.findByIdAndUpdate(
      session.user.id,
      updateData, // Use the dynamic update object
      { new: true, runValidators: true }
    ).select('-password');

    return new Response(JSON.stringify(updatedUser), { status: 200 });

  } catch (error) {
    console.error("Profile update error:", error);
    return new Response(JSON.stringify({ message: "Server error" }), { status: 500 });
  }
}
