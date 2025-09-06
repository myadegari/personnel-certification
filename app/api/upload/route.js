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
  const fileType = data.get('fileType');

  if (!file || !fileType) {
    return NextResponse.json({ error: "File or file type not provided" }, { status: 400 });
  }

  await dbConnect();
  const user = await User.findById(session.user.id).select('personnelNumber');
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // --- منطق جدید برای ساخت نام فایل ---
  const fileExtension = path.extname(file.name);
  // برای تصاویر امضا و مهر، از نام اصلی فایل استفاده می‌کنیم تا تکراری نشوند
  // const simpleFilename = fileType === 'profile' ? `profile${fileExtension}` : `${fileType}-${Date.now()}${fileExtension}`;
  const simpleFilename = `${fileType}-${Date.now()}${fileExtension}`;

  // --- دیباگ کردن مسیرها ---
  const projectRoot = process.cwd();
  console.log('Project Root (process.cwd()):', projectRoot);
  
  const uploadsDir = path.join(projectRoot, 'public', 'uploads');
  console.log('Target Uploads Directory:', uploadsDir);

  const userDir = path.join(uploadsDir, user.personnelNumber);
  console.log('Target User Directory:', userDir);
  
  const filePath = path.join(userDir, simpleFilename);
  console.log('Final File Path:', filePath);
  // --- پایان بخش دیباگ ---

  try {
    // اطمینان از وجود پوشه کاربر
    if (!existsSync(userDir)) {
      await mkdir(userDir, { recursive: true });
      console.log('Created directory:', userDir);
    }
    
    // ذخیره فایل
    await writeFile(filePath, buffer);
    console.log(`File saved successfully to ${filePath}`);

  } catch (error) {
    console.error("Error saving file:", error);
    return NextResponse.json({ error: "Failed to save file on server." }, { status: 500 });
  }

  // ایجاد URL عمومی برای دسترسی از طریق وب
  const publicUrl = `/uploads/${user.personnelNumber}/${simpleFilename}`;
  return NextResponse.json({ url: publicUrl });
}
