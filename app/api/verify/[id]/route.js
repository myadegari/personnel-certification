import { NextResponse } from 'next/server';
import dbConnect from "@/lib/dbConnect";
import Certificate from "@/models/Certificate";
import { renderCertificatePdf } from "@/lib/certificateRender";
import {
  getRenderedCertificate,
  setRenderedCertificate,
} from "@/lib/certificateRenderCache";
import { rateLimit } from '@/lib/rateLimit';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public endpoint: resolves a certification id to its stored render-data
// snapshot and generates the PDF on demand (never persisted). A short-lived
// in-process cache avoids re-rendering on repeat views.
export async function GET(request, { params }) {
  if (!rateLimit(request, { key: "verify", limit: 30, windowMs: 60 * 1000 })) {
    return new NextResponse("Too many requests", { status: 429 });
  }

  try {
    await dbConnect();
    const { id: certificationId } = await params;

    if (!certificationId) {
      return new NextResponse("Missing certification ID", { status: 400 });
    }

    const cert = await Certificate.findOne({ certificationId }).lean();
    if (!cert) {
      return new NextResponse("Certificate not found", { status: 404 });
    }

    let bytes = getRenderedCertificate(certificationId);
    if (!bytes) {
      bytes = await renderCertificatePdf(cert.data);
      setRenderedCertificate(certificationId, bytes);
    }

    // HTTP header values must be Latin-1; legacy certificate numbers can carry
    // Persian digits, so strip non-ASCII from the download filename.
    const safeNumber = String(cert.certificateNumber || "").replace(/[^A-Za-z0-9]/g, "");
    const filename = `certificate-${safeNumber || certificationId}.pdf`;
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'private, max-age=300',
      },
    });

  } catch (error) {
    console.error("Failed to render certificate:", error);
    return new NextResponse("Could not generate certificate.", { status: 500 });
  }
}
