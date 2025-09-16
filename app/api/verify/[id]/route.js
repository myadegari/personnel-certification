import { NextResponse } from 'next/server';
import dbConnect from "@/lib/dbConnect";
import File from "@/models/File";
import { minioClient } from '@/lib/minio';

export async function GET(request, { params }) {
  try {
    await dbConnect();
    const { id: certificationId } = await params;

    if (!certificationId) {
      return new NextResponse("Missing certification ID", { status: 400 });
    }

    const fileRecord = await File.findOne({
      "metadata.job_id": certificationId,
      "metadata.type": "certificate"
    });

    if (!fileRecord) {
      return new NextResponse("Certificate not found", { status: 404 });
    }

    const stream = await minioClient.getObject(fileRecord.bucket, fileRecord.objectName);
    
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${fileRecord.originalName}"`,
      },
    });

  } catch (error) {
    console.error("Failed to stream PDF:", error);
    return new NextResponse("Could not retrieve certificate.", { status: 500 });
  }
}

