// app/api/file/[id]/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import dbConnect from "@/lib/dbConnect";
import File from "@/models/File";
import { getPresignedUrl } from '@/lib/storage';

export async function GET(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  await dbConnect();

  // Find file and validate ownership
  const fileRecord = await File.findOne({
    _id: id
  });

  if (!fileRecord) {
    return NextResponse.json({ error: "File not found or access denied." }, { status: 404 });
  }

  // Only the owner or an admin may access a file
  if (
    session.user.role !== "ADMIN" &&
    fileRecord.userId?.toString() !== session.user.id
  ) {
    return NextResponse.json({ error: "File not found or access denied." }, { status: 403 });
  }

  const now = new Date();

  // --- If URL is still valid, return it ---
  if (fileRecord.expiresAt > now) {
    return NextResponse.json({
      url: fileRecord.presignedUrl,
      expiresAt: fileRecord.expiresAt.toISOString(),
      isRegenerated: false,
    });
  }

  // --- Otherwise, generate new presigned URL ---
  const expirySeconds = 7 * 24 * 60 * 60;
  let newPresignedUrl;
  try {
    newPresignedUrl = await getPresignedUrl({
      bucket: fileRecord.bucket,
      objectName: fileRecord.objectName,
      expiresInSeconds: expirySeconds,
    });
  } catch (error) {
    console.error("Failed to regenerate presigned URL:", error);
    return NextResponse.json({ error: "Could not regenerate access link." }, { status: 500 });
  }

  const newExpiresAt = new Date(Date.now() + expirySeconds * 1000);

  // --- Update DB with new URL ---
  fileRecord.presignedUrl = newPresignedUrl;
  fileRecord.expiresAt = newExpiresAt;
  await fileRecord.save();

  return NextResponse.json({
    url: newPresignedUrl,
    expiresAt: newExpiresAt.toISOString(),
    isRegenerated: true,
  });
}