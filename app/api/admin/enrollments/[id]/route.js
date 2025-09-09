import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Enrollment from "@/models/Enrollment";
import User from "@/models/User";
import Course from "@/models/Course";
import CertificateSequence from "@/models/CertificateSequence"; // <-- مدل جدید را import کنید
import {microserviceAxios} from "@/lib/axios";
import { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";


// This should be the public URL of your Next.js application
const NEXTJS_APP_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

async function triggerCertificateGeneration(dataForMicroservice) {
  console.log("dataForMicroservice",dataForMicroservice)
  try {
    const { data } = await microserviceAxios.post(
      '/certificates/generate/',
      dataForMicroservice
    );
    return data; // باید شامل job_id باشد
  } catch (error) {
    console.error(
      "Microservice communication error:",
      error.response?.data || error.message
    );
    throw new Error("Failed to trigger certificate generation");
  }
}

export async function PUT(request, { params }) {
  try {
    const { id: enrollmentId } = await params;
    const { status } = await request.json();

    await dbConnect();

    const enrollment = await Enrollment.findById(enrollmentId);
    if (!enrollment) {
      return NextResponse.json(
        { error: "Enrollment not found" },
        { status: 404 }
      );
    }

    const previousStatus = enrollment.status;
    enrollment.status = status;

    // --- منطق صدور گواهی ---
    // If status changes to APPROVED and it wasn't approved before
    if (status === "APPROVED" && previousStatus !== "APPROVED") {
      const user = await User.findById(enrollment.user).lean();
      const course = await Course.findById(enrollment.course)
        .populate("signatory signatory2")
        .lean();

      const pattern = course.certificateNumberPattern;
      let sequence = await CertificateSequence.findOne({ pattern: pattern });

      if (!sequence) {
        // If no sequence exists, create a new one starting at 100
        const newSequence = await CertificateSequence.create({
          pattern: pattern,
          lastNumber: 100,
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
        await CertificateSequence.updateOne(
          { pattern: pattern },
          { $inc: { lastNumber: -1 } }
        );
        return NextResponse.json(
          {
            error: `ظرفیت شماره گواهی برای الگوی "${pattern}" به پایان رسیده است.`,
          },
          { status: 400 }
        );
      }

      const certNumber = `${pattern}/${sequence.lastNumber}`;
      const dataForMicroservice = {
        category: course.signatory2 ? "2" : "1",
        user: {
          userId: user._id,
          gender: user.gender,
          firstName: user.firstName,
          lastName: user.lastName,
          nationalId: user.nationalId,
        },
        course: {
          courseCode: course.courseCode,
          name: course.name,
          organizingUnit: course.organizingUnit,
          date: new DateObject({
            date: new Date(course.date * 1000),
            calendar: persian,
          }).format("YYYY/MM/DD"),
          time: course.duration.toString(),
          signatory: {
            gender: course.signatory.gender,
            firstName: course.signatory.firstName,
            lastName: course.signatory.lastName,
            position: course.signatory.position,
            nationalId: course.signatory.nationalId,
            signature: course.signatory.signatureImage,
          },
          signatory2: course.signatory2
            ? {
                gender: course.signatory2.gender,
                firstName: course.signatory2.firstName,
                lastName: course.signatory2.lastName,
                position: course.signatory2.position,
                nationalId: course.signatory2.nationalId,
                signature: course.signatory2.signatureImage,
              }
            : null,
          unitStamp: course.unitStamp,
          unitStamp2: course.unitStamp2,
        },
        certificateNumber: certNumber,
        issuedAt: new DateObject({
          calendar: persian,
          }).format("YYYY/MM/DD"),
        certificationId: enrollmentId,
        // `job_id` در میکروسرویس ساخته می‌شود و برگردانده می‌شود
        qr_url: `${NEXTJS_APP_URL}/verify/${enrollmentId}`,
      };
      const microserviceResponse = await triggerCertificateGeneration(
        dataForMicroservice
      );

      enrollment.jobId = microserviceResponse.job_id; // <-- ذخیره Job ID
      enrollment.issuedAt = dataForMicroservice.issuedAt;
      enrollment.certificateUniqueId = certNumber; // <-- Add certificateUniqueId to enrollment
      enrollment.certificateUrl = `${NEXTJS_APP_URL}/verify/${enrollmentId}`;
    }

    enrollment.status = status;
    const updatedEnrollment = await enrollment.save();

    return NextResponse.json(updatedEnrollment);
  } catch (error) {
    console.error("Enrollment update error:", error);
    return NextResponse.json(
      { error: "Failed to update enrollment" },
      { status: 500 }
    );
  }
}
