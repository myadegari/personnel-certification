import { NextResponse } from 'next/server';
import dbConnect from "@/lib/dbConnect";
import File from "@/models/File";
import { getObjectBuffer } from '@/lib/storage';
import { rateLimit } from '@/lib/rateLimit';

export async function GET(request, { params }) {
  // Public endpoint: throttle per-IP to blunt enumeration/DoS.
  if (!rateLimit(request, { key: "verify", limit: 30, windowMs: 60 * 1000 })) {
    return new NextResponse("Too many requests", { status: 429 });
  }

  try {
    await dbConnect();
    const { id: certificationId } = await params;

    if (!certificationId) {
      return new NextResponse("Missing certification ID", { status: 400 });
    }

    const fileRecord = await File.findOne({
      "metadata.job_id": certificationId,
      bucket: "certificate",
    });

    if (!fileRecord) {
      return new NextResponse("Certificate not found", { status: 404 });
    }

    const buffer = await getObjectBuffer({
      bucket: fileRecord.bucket,
      objectName: fileRecord.objectName,
    });

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

