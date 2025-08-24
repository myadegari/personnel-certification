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
  const fileExtension = path.extname(file.name);
  // Construct the new filename
  const filename = `${user.personnelNumber}-${fileType}${fileExtension}`;

  const uploadsDir = path.join(process.cwd(), 'public/uploads');
  const filePath = path.join(uploadsDir, filename);

  try {
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }
    await writeFile(filePath, buffer);
  } catch (error) {
    console.error("Error saving file:", error);
    return NextResponse.json({ error: "Failed to save file" }, { status: 500 });
  }

  const publicUrl = `/uploads/${filename}`;
  return NextResponse.json({ url: publicUrl });
}