import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import * as Minio from 'minio';
import path from 'path'; // ✅ Make sure this is imported
import { v4 as uuidv4 } from 'uuid';
import FileModel from "@/models/File"; // ✅ Import as FileModel
import Course from '@/models/Course';

// Initialize MinIO Client
const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT) || 9000,
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await request.formData();
  const file = data.get('file');
  const fileType = data.get('fileType');
  const courseCode = data.get('courseCode'); // ✅ Optional, required only for stamp

  if (!file || !fileType) {
    return NextResponse.json({ error: "File or file type not provided" }, { status: 400 });
  }

  await dbConnect();
  const user = await User.findById(session.user.id).select('personnelNumber');
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // --- Determine bucket based on fileType ---
  let bucketName;
  switch (fileType) {
    case 'stamp':
      bucketName = 'stamp';
      if (!courseCode) {
        return NextResponse.json({ error: "courseCode is required for stamp uploads" }, { status: 400 });
      }
      break;
    case 'profile':
      bucketName = 'profile';
      break;
    case 'signature':
      bucketName = 'signature';
      break;
    default:
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }

  // --- Ensure bucket exists ---
  try {
    const bucketExists = await minioClient.bucketExists(bucketName);
    if (!bucketExists) {
      await minioClient.makeBucket(bucketName, 'us-east-1');
      console.log(`Bucket created: ${bucketName}`);
    }
  } catch (err) {
    console.error(`Error checking/creating bucket ${bucketName}:`, err);
    return NextResponse.json({ error: "Failed to prepare storage bucket." }, { status: 500 });
  }

  // --- Generate unique filename ---
  const fileExtension = file.name.includes('.') ? path.extname(file.name) : '';
  const fileName = `${fileType}-${uuidv4()}${fileExtension}`;

  // --- Build object path based on fileType ---
  let objectName;
  if (fileType === 'stamp') {
    objectName = `${courseCode}/${fileName}`; // ✅ Store under course ID
  } else {
    objectName = `${user.personnelNumber}/${fileName}`; // ✅ Store under user ID
  }

  // --- Read file buffer ---
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const metaData = {
    'Content-Type': file.type || 'application/octet-stream',
  };

  // --- Upload to MinIO ---
  try {
    await minioClient.putObject(bucketName, objectName, buffer, buffer.length, metaData);
    console.log(`File uploaded to MinIO: ${bucketName}/${objectName}`);
  } catch (error) {
    console.error("Error uploading to MinIO:", error);
    return NextResponse.json({ error: "Failed to upload file to storage." }, { status: 500 });
  }
  const expirySeconds = 7 * 24 * 60 * 60;
  let presignedUrl;
  try {
    presignedUrl = await minioClient.presignedGetObject(bucketName, objectName, expirySeconds);
  } catch (error) {
    console.error("Presigned URL generation failed:", error);
    return NextResponse.json({ error: "Could not generate access link." }, { status: 500 });
  }
  const expiresAt = new Date(Date.now() + expirySeconds * 1000);
  const newFile = new FileModel({
    userId: user._id,
    courseId: fileType === 'stamp' ? courseCode : undefined,
    bucket: bucketName,
    objectName: objectName,
    originalName: file.name,
    mimeType: file.type,
    size: buffer.length,
    presignedUrl: presignedUrl,
    expiresAt: expiresAt,
  });
  try {
    await newFile.save();
  } catch (error) {
    console.error("Failed to save file record:", error);
    return NextResponse.json({ error: "Failed to save file metadata." }, { status: 500 });
  }
  // // --- Generate public URL ---
  // const publicUrl = `http://${process.env.MINIO_ENDPOINT || 'localhost'}:${process.env.MINIO_PORT || 9000}/${bucketName}/${encodeURIComponent(objectName)}`;
  // ✅ --- UPDATE USER IF PROFILE OR SIGNATURE ---
try {
  if (fileType === 'profile') {
    await User.findByIdAndUpdate(user._id, { profileImage: newFile._id });
  } else if (fileType === 'signature') {
    await User.findByIdAndUpdate(user._id, { signatureImage: newFile._id });
  }else if (fileType === 'stamp') {
    const course = await Course.findOne({ courseCode: courseCode });
    if (course) {
      await Course.findByIdAndUpdate(course._id, { stampImage: newFile._id });
    }
  }
} catch (error) {
  console.error("Failed to update user with file reference:", error);
  // Optional: You can notify frontend or log warning, but don't break upload
}
  return NextResponse.json({ file: newFile });
}