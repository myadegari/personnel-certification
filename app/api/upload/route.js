import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { NextResponse } from 'next/server';
import path from 'path';
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await request.formData();
  const file = data.get('file');
  const fileType = data.get('fileType'); // 'profile' or 'signature'

  if (!file || !fileType) {
    return NextResponse.json({ error: "File or file type not provided" }, { status: 400 });
  }

  // Fetch the user from DB to get their personnelNumber
  await dbConnect();
  const user = await User.findById(session.user.id).select('personnelNumber');
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // --- NEW FILENAME LOGIC ---
  // Get the original file extension
  const userUploadDir = path.join(process.cwd(), 'public/uploads', user.personnelNumber);

  // 2. ساختن نام فایل جدید و ساده
  const fileExtension = path.extname(file.name);
  const filename = `${fileType}${fileExtension}`; // مثلا: profile.png یا signature.png

  // 3. تعریف مسیر کامل فایل
  const filePath = path.join(userUploadDir, filename);

  try {
    if (!existsSync(userUploadDir)) {
      await mkdir(userUploadDir, { recursive: true });
    }
    await writeFile(filePath, buffer);
  } catch (error) {
    console.error("Error saving file:", error);
    return NextResponse.json({ error: "Failed to save file" }, { status: 500 });
  }

  const publicUrl = `/uploads/${user.personnelNumber}/${filename}`;
  return NextResponse.json({ url: publicUrl });
}