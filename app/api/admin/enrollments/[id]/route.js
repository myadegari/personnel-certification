import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Enrollment from '@/models/Enrollment';
import User from '@/models/User';
import Course from '@/models/Course';
import CertificateSequence from '@/models/CertificateSequence'; // <-- مدل جدید را import کنید


// --- شبیه‌سازی فراخوانی میکروسرویس صدور گواهی ---
async function generateCertificate(enrollmentData) {
  console.log("Calling certificate microservice with:", enrollmentData);
  // In a real app, this would be an actual HTTP request to your FastAPI service
  await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay
  return {
    certificateUrl: `/certificates/cert-${enrollmentData.user.personnelNumber}-${Date.now()}.pdf`,
    certificateUniqueId: `404/گ/${Math.floor(Math.random() * 1000)}`,
  };
}

export async function PUT(request, { params }) {
  try {
    const { id: enrollmentId } = params;
    const { status } = await request.json();

    await dbConnect();

    const enrollment = await Enrollment.findById(enrollmentId);
    if (!enrollment) {
      return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 });
    }

    const previousStatus = enrollment.status;
    enrollment.status = status;

    // --- منطق صدور گواهی ---
    // If status changes to APPROVED and it wasn't approved before
    if (status === 'APPROVED' && previousStatus !== 'APPROVED') {
      const user = await User.findById(enrollment.user).lean();
      const course = await Course.findById(enrollment.course).lean();
      const pattern = course.certificateNumberPattern;
      const sequence = await CertificateSequence.findOneAndUpdate(
        { pattern: pattern },
        { $inc: { lastNumber: 1 },$setOnInsert: { lastNumber: 99 }  },
        { upsert: true, new: true }
      );
       // بررسی رسیدن به سقف مجاز
    if (sequence.lastNumber > 999) {
      // شماره به سقف رسیده، عملیات را برگردان (Rollback) و خطا بده
      await CertificateSequence.updateOne({ pattern: pattern }, { $inc: { lastNumber: -1 } });
      return NextResponse.json({ error: `ظرفیت شماره گواهی برای الگوی "${pattern}" به پایان رسیده است.` }, { status: 400 });
    }

      const certNumber = `${pattern}/${sequence.lastNumber}`;
      enrollment.certificateNumber = certNumber; // <-- Add certificate number to enrollment
      const certificateData = await generateCertificate({ user, course,certNumber });
      
      enrollment.certificateUrl = certificateData.certificateUrl;
      enrollment.certificateUniqueId = certificateData.certificateUniqueId;
      enrollment.issuedAt = new Date();
    }
    enrollment.status = status;
    const updatedEnrollment = await enrollment.save();

    return NextResponse.json(updatedEnrollment);
  } catch (error) {
    console.error("Enrollment update error:", error);
    return NextResponse.json({ error: 'Failed to update enrollment' }, { status: 500 });
  }
}
