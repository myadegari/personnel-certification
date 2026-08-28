import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Enrollment from "@/models/Enrollment";
import User from "@/models/User";
import CertificateSequence from "@/models/Indicator";
import { microserviceAxios } from "@/lib/axios";
import { INDICATOR_MAX_NUMBER } from "@/lib/certificateService";
import { requireAdmin } from "@/lib/authGuard";
import { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";

const REPORT_PATTERN = "404/گ";
const REPORT_PATTERN_FIRST_NUMBER = 100;

/**
 * Atomically reserves the next report number.
 * Existing counters are incremented atomically; a brand-new counter is seeded
 * so its first number is REPORT_PATTERN_FIRST_NUMBER. A unique-index race on
 * first creation is retried once.
 */
async function reserveReportNumber() {
  const incremented = await CertificateSequence.findOneAndUpdate(
    { pattern: REPORT_PATTERN },
    { $inc: { lastNumber: 1 } },
    { new: true }
  );
  if (incremented) return incremented;

  try {
    return await CertificateSequence.create({
      pattern: REPORT_PATTERN,
      lastNumber: REPORT_PATTERN_FIRST_NUMBER,
    });
  } catch (err) {
    if (err?.code === 11000) {
      const raced = await CertificateSequence.findOneAndUpdate(
        { pattern: REPORT_PATTERN },
        { $inc: { lastNumber: 1 } },
        { new: true }
      );
      if (raced) return raced;
    }
    throw err;
  }
}

export async function POST(request) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  try {
    const { year } = await request.json(); // e.g., 1403
    if (!year) {
      return NextResponse.json({ error: "Year is required" }, { status: 400 });
    }

    await dbConnect();
    const userId = session.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find all approved enrollments for the user and populate course details
    const enrollments = await Enrollment.find({
      user: userId,
      status: "APPROVED",
    })
      .populate("course")
      .lean();

    // Filter enrollments by the selected Persian year
    const yearNumber = parseInt(year, 10);
    const filteredEnrollments = enrollments.filter((e) => {
      if (!e.course || !e.course.date) return false;
      const courseDate = new DateObject({
        date: new Date(e.course.date * 1000),
        calendar: persian,
      });
      return courseDate.year === yearNumber;
    });

    if (filteredEnrollments.length === 0) {
      return NextResponse.json(
        { error: `No approved enrollments found for year ${year}` },
        { status: 404 }
      );
    }

    // Atomically reserve the report number
    let sequence = await reserveReportNumber();

    if (sequence.lastNumber > INDICATOR_MAX_NUMBER) {
      await CertificateSequence.updateOne(
        { pattern: REPORT_PATTERN },
        { $inc: { lastNumber: -1 } }
      );
      return NextResponse.json(
        {
          error: `ظرفیت شماره گزارش برای الگوی "${REPORT_PATTERN}" به پایان رسیده است.`,
        },
        { status: 400 }
      );
    }

    const certNumber = `${REPORT_PATTERN}/${sequence.lastNumber}`;

    // Calculate total duration and format data for the microservice
    let totalDuration = 0;
    const enrollmentData = filteredEnrollments.map((enrollment) => {
      totalDuration += enrollment.course.duration;
      return {
        course: {
          name: enrollment.course.name,
          organizingUnit: enrollment.course.organizingUnit,
          date: new DateObject({
            date: new Date(enrollment.course.date * 1000),
            calendar: persian,
          }).format("YYYY/MM/DD"),
          duration: enrollment.course.duration,
        },
        certificateUniqueId: enrollment.certificateUniqueId,
        issuedAt: enrollment.issuedAt,
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
      date: {
        issue: new DateObject({ calendar: persian }).format("YYYY/MM/DD"),
        year: yearNumber,
      },
      enrollments: enrollmentData,
      total: totalDuration,
      reportuniqueid: certNumber,
    };

    // Trigger the microservice
    const { data } = await microserviceAxios.post("/reports/generate", reportPayload);

    // Return the job_id to the client
    return NextResponse.json({ jobId: data.job_id });
  } catch (err) {
    console.error("Report generation error:", err);
    return NextResponse.json(
      { error: "Failed to start report generation" },
      { status: 500 }
    );
  }
}
