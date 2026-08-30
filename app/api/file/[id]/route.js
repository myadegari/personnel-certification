// app/api/file/[id]/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import dbConnect from "@/lib/dbConnect";
import File from "@/models/File";
import { getPresignedUrl, getObjectBuffer } from '@/lib/storage';
import { isStaffRole } from '@/lib/roles';

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

  // Only the owner or a staff user may access a file
  if (
    !isStaffRole(session.user.role) &&
    fileRecord.userId?.toString() !== session.user.id
  ) {
    return NextResponse.json({ error: "File not found or access denied." }, { status: 403 });
  }

  // ?raw=1 streams the bytes same-origin (used by the pdf.js thumbnails —
  // fetching the cross-origin presigned URL would need storage CORS and
  // would taint the canvas).
  const wantsRaw = new URL(request.url).searchParams.get("raw");
  if (wantsRaw) {
    try {
      const buffer = await getObjectBuffer({
        bucket: fileRecord.bucket,
        objectName: fileRecord.objectName,
      });
      return new NextResponse(buffer, {
        status: 200,
        headers: {
          "Content-Type": fileRecord.mimeType || "application/octet-stream",
          "Content-Disposition": `inline; filename="${(fileRecord.originalName || "file").replace(/["\r\n]/g, "")}"`,
          "Cache-Control": "private, max-age=300",
        },
      });
    } catch (error) {
      console.error("Failed to stream file:", error);
      return NextResponse.json({ error: "Could not retrieve file." }, { status: 500 });
    }
  }

  // Always regenerate a fresh, browser-facing (public-signed) presigned URL.
  // Stored URLs may have been signed against the internal host and would fail
  // signature validation in the browser.
  const expirySeconds = 7 * 24 * 60 * 60;
  let newPresignedUrl;
  try {
    newPresignedUrl = await getPresignedUrl({
      bucket: fileRecord.bucket,
      objectName: fileRecord.objectName,
      expiresInSeconds: expirySeconds,
    });
  } catch (error) {
    console.error("Failed to generate presigned URL:", error);
    return NextResponse.json({ error: "Could not generate access link." }, { status: 500 });
  }

  const newExpiresAt = new Date(Date.now() + expirySeconds * 1000);

  fileRecord.presignedUrl = newPresignedUrl;
  fileRecord.expiresAt = newExpiresAt;
  await fileRecord.save();

  return NextResponse.json({
    url: newPresignedUrl,
    expiresAt: newExpiresAt.toISOString(),
    isRegenerated: true,
  });
}