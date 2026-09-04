import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";
import dbConnect from "@/lib/dbConnect";
import Certificate from "@/models/Certificate";
import Enrollment from "@/models/Enrollment";
import GuestCertificate from "@/models/GuestCertificate";
import { rateLimit } from "@/lib/rateLimit";

/**
 * GET /api/verify/[id]/meta
 * Public JSON companion to the PDF route: resolves a certification id to the
 * human-readable facts a third party needs to authenticate a certificate
 * (holder, course, issue date, number). Applies the same gate as the PDF route
 * — a stored render-data snapshot must exist — so "valid" metadata is never
 * returned for a certificate that cannot be served.
 */
export async function GET(request, { params }) {
  if (!rateLimit(request, { key: "verify-meta", limit: 30, windowMs: 60 * 1000 })) {
    return NextResponse.json({ error: "تعداد درخواست‌ها بیش از حد مجاز است." }, { status: 429 });
  }

  try {
    await dbConnect();
    const { id: certificationId } = await params;

    if (!certificationId || !isValidObjectId(certificationId)) {
      return NextResponse.json(
        { error: "شناسه گواهی نامعتبر است." },
        { status: 400 }
      );
    }

    // Same gate as the PDF route: a render-data snapshot must exist.
    const certExists = await Certificate.exists({ certificationId });
    if (!certExists) {
      return NextResponse.json(
        { error: "گواهینامه‌ای با این شناسه یافت نشد." },
        { status: 404 }
      );
    }

    // Guest certificates (bulk issuance to persons without an account):
    // the GuestCertificate _id doubles as the certificationId.
    const guest = await GuestCertificate.findById(certificationId)
      .populate("course", "name")
      .select("certificateNumber fullName nationalId course issuedAt")
      .lean();

    if (guest) {
      return NextResponse.json({
        valid: true,
        certificateNumber: guest.certificateNumber || null,
        holder: guest.fullName || null,
        identifier: guest.nationalId || null,
        course: guest.course?.name || null,
        issuedAt: guest.issuedAt || null,
      });
    }

    // Normal user certificates: the Enrollment _id is the certificationId.
    const enrollment = await Enrollment.findById(certificationId)
      .populate("user", "firstName lastName personnelNumber")
      .populate("course", "name")
      .select("certificateUniqueId user course issuedAt")
      .lean();

    if (!enrollment) {
      return NextResponse.json(
        { error: "گواهینامه‌ای با این شناسه یافت نشد." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      valid: true,
      certificateNumber: enrollment.certificateUniqueId || null,
      holder: [enrollment.user?.firstName, enrollment.user?.lastName]
        .filter(Boolean)
        .join(" ") || null,
      identifier: enrollment.user?.personnelNumber || null,
      course: enrollment.course?.name || null,
      issuedAt: enrollment.issuedAt || null,
    });
  } catch (error) {
    console.error("Failed to resolve certificate metadata:", error);
    return NextResponse.json(
      { error: "خطای سرور در اعتبارسنجی گواهینامه." },
      { status: 500 }
    );
  }
}
