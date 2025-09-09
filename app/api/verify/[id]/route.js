// app/api/verify/[id]/route.js
import { NextResponse } from 'next/server';
import dbConnect from "@/lib/dbConnect";
import File from "@/models/File"; // or FileModel
// import * as Minio from 'minio';
import { minioClient } from '@/lib/minio';

// const minioClient = new Minio.Client({
//   endPoint: process.env.MINIO_ENDPOINT || 'localhost',
//   port: parseInt(process.env.MINIO_PORT) || 9000,
//   useSSL: process.env.MINIO_USE_SSL === 'false',
//   accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
//   secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
// });

export async function GET(request, { params }) {
  await dbConnect();

  const { id: certificationId } = await params;

  if (!certificationId) {
    return NextResponse.json({ error: "Missing certification ID" }, { status: 400 });
  }

  // --- Find file by metadata.job_id ---
  const fileRecord = await File.findOne({
    "metadata.job_id": certificationId,
    "metadata.type": "certificate"
  });

  if (!fileRecord) {
    return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
  }
  if (fileRecord.mimeType !== 'application/pdf') {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }

  // --- Generate presigned URL (long expiry for public access) ---
//   const expirySeconds = 7 * 24 * 60 * 60; // 7 days — adjust as needed
//   let presignedUrl;
//   try {
//     presignedUrl = await minioClient.presignedGetObject(
//       fileRecord.bucket,
//       fileRecord.objectName,
//       expirySeconds
//     );
//   } catch (error) {
//     console.error("Failed to generate presigned URL:", error);
//     return NextResponse.json({ error: "Could not generate certificate link." }, { status: 500 });
//   }

  // ✅ OPTION 1: REDIRECT USER TO PRESIGNED URL
//   return NextResponse.redirect(presignedUrl, 302);
try {
    const stream = await minioClient.getObject(fileRecord.bucket, fileRecord.objectName);
  
    // Convert stream to buffer (for small files — not recommended for huge PDFs)
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
  
    return new NextResponse(buffer, {
      headers: {
        'Cache-Control': 'public, max-age=86400', // Cache for 1 day
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${fileRecord.originalName}"`,
      },
    });
  
  } catch (error) {
    console.error("Failed to stream PDF:", error);
    return NextResponse.json({ error: "Could not retrieve certificate." }, { status: 500 });
  }

  // ✅ OPTION 2: STREAM PDF CONTENT (if you want to hide MinIO URL)
  // See below for streaming version
}