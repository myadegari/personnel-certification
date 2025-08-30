import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { NextResponse } from 'next/server';
import path from 'path';
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
// import { buffer } from 'node:stream/consumers'; 

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

  // const bytes = await file.arrayBuffer();
  // const buffer = Buffer.from(bytes);
  // const bufferData = await buffer(file.stream());
  const bytes = await file.arrayBuffer();
  const bufferData = Buffer.from(bytes);
  // --- NEW FILENAME LOGIC ---
  // Get the original file extension
   // Make user upload directory
   const userUploadDir = path.join(process.cwd(), 'public/uploads', user.personnelNumber);
   if (!existsSync(userUploadDir)) {
     await mkdir(userUploadDir, { recursive: true });
   }

   // Keep original extension
   const fileExtension = path.extname(file.name || '');
   const filename = `${fileType}${fileExtension}`;
   
   // 3. تعریف مسیر کامل فایل
   const filePath = path.join(userUploadDir, filename); 

   try {
    await writeFile(filePath, bufferData);
  } catch (error) {
    console.error("Error saving file:", error);
    return NextResponse.json({ error: "Failed to save file" }, { status: 500 });
  }

  const publicUrl = `/uploads/${user.personnelNumber}/${filename}`;
  return NextResponse.json({ url: publicUrl, message: "File uploaded successfully" });
}