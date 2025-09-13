import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
// import * as Minio from 'minio';
import path from "path"; // ✅ Make sure this is imported
// import { v4 as uuidv4 } from "uuid";
import File from "@/models/File"; // ✅ Import as FileModel
import Course from "@/models/Course";
import { minioClient } from "@/lib/minio";
// import { useQueryClient } from "@tanstack/react-query";

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
    const bucketExists = await minioClient.bucketExists(bucketName);
    if (!bucketExists) {
      await minioClient.makeBucket(bucketName, "us-east-1");
      console.log(`Bucket created: ${bucketName}`);
    }
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
  const metaData = {
    "Content-Type": file.type || "application/octet-stream",
  };

  // --- Upload to MinIO ---
  try {
    await minioClient.putObject(
      bucketName,
      objectName,
      buffer,
      buffer.length,
      metaData
    );
    console.log(`File uploaded to MinIO: ${bucketName}/${objectName}`);
  } catch (error) {
    console.error("Error uploading to MinIO:", error);
    return NextResponse.json(
      { error: "Failed to upload file to storage." },
      { status: 500 }
    );
  }
  const expirySeconds = 7 * 24 * 60 * 60;
  let presignedUrl;
  try {
    presignedUrl = await minioClient.presignedGetObject(
      bucketName,
      objectName,
      expirySeconds
    );
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
    fileRecord.mimeType = file.type;
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
      mimeType: file.type,
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
// ✅ --- UPDATE USER IF PROFILE OR SIGNATURE ---
