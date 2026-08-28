import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import File from "@/models/File";
import Course from "@/models/Course";
import { requireAdmin } from "@/lib/authGuard";
import { readValidatedImage } from "@/lib/uploadValidation";
import {
  ensureBucket,
  putBuffer,
  getPresignedUrl,
} from "@/lib/storage";

export async function POST(request) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  const data = await request.formData();
  const file = data.get("file");
  const fileType = data.get("fileType");
  const courseCode = data.get("courseCode");

  if (!file || !fileType) {
    return NextResponse.json(
      { error: "File or file type not provided" },
      { status: 400 }
    );
  }

  if (!["stamp1", "stamp2"].includes(fileType)) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }

  if (!courseCode) {
    return NextResponse.json(
      { error: "courseCode is required for stamp uploads" },
      { status: 400 }
    );
  }

  await dbConnect();

  const course = await Course.findOne({ courseCode });
  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const bucketName = "stamp";
  try {
    await ensureBucket(bucketName);
  } catch (err) {
    console.error(`Error checking/creating bucket ${bucketName}:`, err);
    return NextResponse.json(
      { error: "Failed to prepare storage bucket." },
      { status: 500 }
    );
  }

  const validated = await readValidatedImage(file);
  if (validated.error) {
    return NextResponse.json({ error: validated.error }, { status: validated.status });
  }

  const { buffer, mimeType, extension } = validated;
  const fileName = `${fileType}${extension}`;
  const objectName = `${course._id}/${fileName}`;

  try {
    await putBuffer({
      bucket: bucketName,
      objectName,
      buffer,
      contentType: mimeType,
    });
  } catch (err) {
    console.error("Error uploading file to storage:", err);
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
  } catch (err) {
    console.error("Presigned URL generation failed:", err);
    return NextResponse.json({ error: "Could not generate access link." }, { status: 500 });
  }

  const expiresAt = new Date(Date.now() + expirySeconds * 1000);
  const fileRecord = await File.findOne({ objectName });

  if (fileRecord) {
    fileRecord.originalName = file.name;
    fileRecord.mimeType = mimeType;
    fileRecord.size = buffer.length;
    fileRecord.presignedUrl = presignedUrl;
    fileRecord.expiresAt = expiresAt;
    try {
      await fileRecord.save();
      return NextResponse.json({ file: fileRecord, url: fileRecord._id });
    } catch (err) {
      console.error("Failed to save file record:", err);
      return NextResponse.json({ error: "Failed to save file metadata." }, { status: 500 });
    }
  }

  const newFile = new File({
    userId: session.user.id,
    courseId: course._id,
    bucket: bucketName,
    objectName,
    originalName: file.name,
    mimeType,
    size: buffer.length,
    presignedUrl,
    expiresAt,
  });

  try {
    await newFile.save();
  } catch (err) {
    console.error("Failed to save file record:", err);
    return NextResponse.json({ error: "Failed to save file metadata." }, { status: 500 });
  }

  try {
    if (fileType === "stamp1") {
      await Course.findByIdAndUpdate(course._id, { unitStamp: newFile._id });
    } else if (fileType === "stamp2") {
      await Course.findByIdAndUpdate(course._id, { unitStamp2: newFile._id });
    }
  } catch (err) {
    console.error("Failed to update course with file reference:", err);
  }

  return NextResponse.json({ file: newFile, url: newFile._id });
}
