import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Enrollment from "@/models/Enrollment";
import Course from "@/models/Course";
import User from "@/models/User";
import CertificateSequence from "@/models/Indicator"
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Adjust path to your authOptions
import { microserviceAxios } from "@/lib/axios";
import { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { year } = await request.json(); // e.g., 1403
    if (!year) {
      return NextResponse.json({ error: "Year is required" }, { status: 400 });
    }

    await dbConnect();
    const userId = session.user.id;
    const user = await User.findById(userId)

    // Find all approved enrollments for the user and populate course details
    const enrollments = await Enrollment.find({
      user: userId,
      status: "APPROVED",
    }).populate(
        'course'
    ).lean();

    // Filter enrollments by the selected Persian year
    const yearNumber = parseInt(year, 10);
    const filteredEnrollments = enrollments.filter(e => {
        if (!e.course || !e.course.date) return false;
        const courseDate = new DateObject({
            date: new Date(e.course.date * 1000),
            calendar: persian,
        });
        return courseDate.year === yearNumber;
    });

    if (filteredEnrollments.length === 0) {
        return NextResponse.json({ error: `No approved enrollments found for year ${year}` }, { status: 404 });
    }

    const pattern = "404/گ";
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
    // Calculate total duration and format data for the microservice
    let totalDuration = 0;
    const enrollmentData = filteredEnrollments.map(enrollment => {
        totalDuration += enrollment.course.duration;
        return {
            course:{
                name: enrollment.course.name,
                organizingUnit: enrollment.course.organizingUnit,
                date:new DateObject({ date: new Date(enrollment.course.date * 1000), calendar: persian }).format("YYYY/MM/DD"),
                duration: enrollment.course.duration,
            },
            certificateUniqueId: enrollment.certificateUniqueId,
            issuedAt: enrollment.issuedAt
        };
    });

    // Data to send to FastAPI
    const reportPayload = {
        user: {
            userId: user._id,
            gender: user.gender,
            firstName: user.firstName,
            lastName: user.lastName,
            nationalId: user.nationalId,
          },
          date:{
              issue: new DateObject({
                calendar: persian,
                }).format("YYYY/MM/DD"),

                year: yearNumber,
          },
        enrollments: enrollmentData,
        total: totalDuration,
        reportuniqueid:certNumber
    };
    
    // Trigger the microservice
    const { data } = await microserviceAxios.post('/reports/generate', reportPayload);
    
    // Return the job_id to the client
    return NextResponse.json({ jobId: data.job_id });

  } catch (error) {
    console.error("Report generation error:", error);
    return NextResponse.json({ error: "Failed to start report generation" }, { status: 500 });
  }
}