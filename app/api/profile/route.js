// File: app/api/profile/route.js
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import File from "@/models/File";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });

  await dbConnect();
  const user = await User.findById(session.user.id).select('-password -resetPasswordToken -resetPasswordExpires').lean();
  if (!user) return new Response(JSON.stringify({ message: "User not found" }), { status: 404 });

  return new Response(JSON.stringify(user), { status: 200 });
}

/**
 * Validates that an image reference is a File record uploaded by the
 * requesting user with the expected bucket. Prevents attaching arbitrary
 * file references to the account.
 */
async function resolveOwnFileId(fileId, userId, bucket) {
  if (!fileId) return undefined;
  const file = await File.findOne({ _id: fileId, userId, bucket }).select("_id");
  return file ? file._id : undefined;
}

export async function PUT(request) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 });

  try {
    const { firstName, lastName, email, position, profileImage, signatureImage } = await request.json();

    // Build the update object dynamically
    const updateData = {
      firstName,
      lastName,
      email,
      position,
    };

    await dbConnect();

    // Only accept image references pointing at files this user actually owns
    const resolvedProfileImage = await resolveOwnFileId(profileImage, session.user.id, "profile");
    if (resolvedProfileImage) updateData.profileImage = resolvedProfileImage;
    const resolvedSignatureImage = await resolveOwnFileId(signatureImage, session.user.id, "signature");
    if (resolvedSignatureImage) updateData.signatureImage = resolvedSignatureImage;

    const updatedUser = await User.findByIdAndUpdate(
      session.user.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    return new Response(JSON.stringify(updatedUser), { status: 200 });
  } catch (error) {
    console.error("Profile update error:", error);
    return new Response(JSON.stringify({ message: "Server error" }), { status: 500 });
  }
}
