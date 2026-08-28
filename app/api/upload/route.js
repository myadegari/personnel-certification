import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import path from "path";
import File from "@/models/File";
import Course from "@/models/Course";
import {
  ensureBucket,
  putBuffer,
  getPresignedUrl,
} from "@/lib/storage";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

// Verify the actual bytes match the declared image type (cheap magic-number check)
function matchesImageSignature(buffer, mimeType) {
  const b = buffer;
  if (mimeType === "image/jpeg") {
    return b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return (
      b.length > 8 &&
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47
    );
  }
  if (mimeType === "image/webp") {
    return (
      b.length > 12 &&
      b.toString("ascii", 0, 4) === "RIFF" &&
      b.toString("ascii", 8, 12) === "WEBP"
    );
  }
  return false;
}


export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await request.formData();
  const file = data.get("file");
  const fileType = data.get("fileType");
  const courseCode = data.get("courseCode"); // ✅ Optional, required only for stamp

  if (!file || !fileType) {
    return NextResponse.json(
      { error: "File or file type not provided" },
      { status: 400 }
    );
  }

  // --- Validate size and type ---
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "File is too large. Maximum allowed size is 5 MB." },
      { status: 413 }
    );
  }
  const mimeType = file.type || "";
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return NextResponse.json(
      { error: "Only JPEG, PNG or WebP images are allowed." },
      { status: 415 }
    );
  }

  await dbConnect();
  const user = await User.findById(session.user.id).select("personnelNumber");
  let course;
  if (courseCode) {
    course = await Course.findOne({ courseCode: courseCode });
  }
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // --- Determine bucket based on fileType ---
  let bucketName;
  switch (fileType) {
    case "stamp1":
      bucketName = "stamp";
      if (!courseCode) {
        return NextResponse.json(
          { error: "courseCode is required for stamp uploads" },
          { status: 400 }
        );
      }
      break;
    case "stamp2":
      bucketName = "stamp";
      if (!courseCode) {
        return NextResponse.json(
          { error: "courseCode is required for stamp uploads" },
          { status: 400 }
        );
      }
      break;
    case "profile":
      bucketName = "profile";
      break;
    case "signature":
      bucketName = "signature";
      break;
    default:
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }

  // --- Ensure bucket exists ---
  try {
    await ensureBucket(bucketName);
  } catch (err) {
    console.error(`Error checking/creating bucket ${bucketName}:`, err);
    return NextResponse.json(
      { error: "Failed to prepare storage bucket." },
      { status: 500 }
    );
  }

  // --- Generate unique filename ---
  const fileExtension = file.name.includes(".") ? path.extname(file.name) : "";
  const fileName = ["profile", "signature"].includes(fileType)
    ? `${fileType}-${user.personnelNumber}${fileExtension}`
    : `${fileType}${fileExtension}`;

  // --- Build object path based on fileType ---
  let objectName;
  if (fileType.startsWith("stamp")) {
    objectName = `${course._id}/${fileName}`; // ✅ Store under course ID
  } else {
    objectName = `${user.personnelNumber}/${fileName}`; // ✅ Store under user ID
  }

  // --- Read file buffer ---
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Reject files whose contents don't match an allowed image format
  if (!matchesImageSignature(buffer, mimeType)) {
    return NextResponse.json(
      { error: "File content does not look like a valid image." },
      { status: 415 }
    );
  }

  const metaData = mimeType;

  // --- Upload to object storage ---
  try {
    await putBuffer({
      bucket: bucketName,
      objectName,
      buffer,
      contentType: metaData,
    });
  } catch (error) {
    console.error("Error uploading file to storage:", error);
    return NextResponse.json(
      { error: "Failed to upload file to storage." },
      { status: 500 }
    );
  }
  const expirySeconds = 7 * 24 * 60 * 60;
  let presignedUrl;
  try {
    presignedUrl = await getPresignedUrl({
      bucket: bucketName,
      objectName,
      expiresInSeconds: expirySeconds,
    });
  } catch (error) {
    console.error("Presigned URL generation failed:", error);
    return NextResponse.json(
      { error: "Could not generate access link." },
      { status: 500 }
    );
  }
  const expiresAt = new Date(Date.now() + expirySeconds * 1000);
  const fileRecord = await File.findOne({
    objectName: objectName,
  });
  if (fileRecord) {
    fileRecord.originalName = file.name;
    fileRecord.mimeType = mimeType;
    fileRecord.size = buffer.length;
    fileRecord.presignedUrl = presignedUrl;
    fileRecord.expiresAt = expiresAt;
    try {
      await fileRecord.save();
      return NextResponse.json({ file: fileRecord });
    } catch (error) {
      console.error("Failed to save file record:", error);
      return NextResponse.json(
        { error: "Failed to save file metadata." },
        { status: 500 }
      );
    }
  } else {
    const newFile = new File({
      userId: user._id,
      courseId: fileType.startsWith("stamp") ? course._id : undefined,
      bucket: bucketName,
      objectName: objectName,
      originalName: file.name,
      mimeType: mimeType,
      size: buffer.length,
      presignedUrl: presignedUrl,
      expiresAt: expiresAt,
    });
    try {
      await newFile.save();
    } catch (error) {
      console.error("Failed to save file record:", error);
      return NextResponse.json(
        { error: "Failed to save file metadata." },
        { status: 500 }
      );
    }
    try {
      if (fileType === "profile") {
        await User.findByIdAndUpdate(user._id, { profileImage: newFile._id });
      } else if (fileType === "signature") {
        await User.findByIdAndUpdate(user._id, { signatureImage: newFile._id });
      } else if (fileType.startsWith("stamp")) {
        switch (fileType) {
          case "stamp1":
            await Course.findByIdAndUpdate(course._id, {
              unitStamp: newFile._id,
            });
            break;
          case "stamp2":
            await Course.findByIdAndUpdate(course._id, {
              unitStamp2: newFile._id,
            });
            break;
        }
      }
    } catch (error) {
      console.error("Failed to update user with file reference:", error);
    }
    return NextResponse.json({ file: newFile });
  }
}
