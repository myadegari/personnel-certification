import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Enrollment from '@/models/Enrollment';
import User from '@/models/User';
import Course from '@/models/Course';
import CertificateSequence from '@/models/CertificateSequence'; // <-- مدل جدید را import کنید
import axios from 'axios';
import { DateObject } from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';


// --- شبیه‌سازی فراخوانی میکروسرویس صدور گواهی ---
async function generateCertificate(enrollmentData) {
  console.log("Calling certificate microservice with:", enrollmentData);
  // In a real app, this would be an actual HTTP request to your FastAPI service
  const formattedData = {
    user: {
      firstName: enrollmentData.user.firstName,
      lastName: enrollmentData.user.lastName,
      personnelNumber: enrollmentData.user.personnelNumber,
      nationalId: enrollmentData.user.nationalId
    },
    course: {
      name: enrollmentData.course.name,
      organizingUnit: enrollmentData.course.organizingUnit,
      date: new DateObject({ calendar: persian, locale: persian_fa, date: new Date(enrollmentData.course.date*1000) }).format()
    },
    certificateNumber: enrollmentData.certNumber
  };

  try {
    const { data } = await axios.post('http://localhost:8000/', formattedData);
    console.log("Certificate microservice response:", data);
    
    return {
      certificateUrl: data.certificateUrl || `/certificates/cert-${formattedData.user.personnelNumber}-${Date.now()}.pdf`,
      certificateUniqueId: data.certificateUniqueId || `404/گ/${Math.floor(Math.random() * 1000)}`,
    };
  } catch (error) {
    console.error("Certificate generation error:", error.response?.data || error.message);
    throw new Error('Failed to generate certificate');
  }
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
      let sequence = await CertificateSequence.findOne({ pattern: pattern });

if (!sequence) {
  // If no sequence exists, create a new one starting at 100
  const newSequence = await CertificateSequence.create({
    pattern: pattern,
    lastNumber: 100
  });
  sequence = newSequence;
} else {
  // If sequence exists, increment the number
  sequence.lastNumber += 1;
  await sequence.save();
}

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
