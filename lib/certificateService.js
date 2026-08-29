import Indicator from "@/models/Indicator";
import IndicatorUsage from "@/models/IndicatorUsage";
import { microserviceAxios } from "@/lib/axios";
import { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";

// Maximum sequential number per yearly certificate counter (4-digit issue
// number).
export const INDICATOR_MAX_NUMBER = 9999;

// Absolute public URL of this app; encoded into certificate QR codes so
// scans resolve to a real host instead of a bare path.
function getSiteUrl() {
  const url = process.env.PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
  return url.replace(/\/+$/, "");
}

// Helper function for microservice communication
async function triggerCertificateGeneration(dataForMicroservice) {
  try {
    const { data } = await microserviceAxios.post(
      "/certificates/generate/",
      dataForMicroservice
    );
    return data;
  } catch (error) {
    console.error(
      "Microservice communication error:",
      error.response?.data || error.message
    );
    throw new Error("Failed to trigger certificate generation");
  }
}

/**
 * Atomically reserves the next certificate sequence number for a Jalali year.
 * The counter lives in the shared Indicator collection under the pattern
 * `CERT-<yearKey>` and is seeded so the first issued number is 1.
 */
async function reserveCertificateNumber(yearKey) {
  const pattern = `CERT-${yearKey}`;
  const incremented = await Indicator.findOneAndUpdate(
    { pattern },
    { $inc: { lastNumber: 1 } },
    { new: true }
  );
  if (incremented) return incremented;

  try {
    return await Indicator.create({ pattern, lastNumber: 1 });
  } catch (err) {
    if (err?.code === 11000) {
      const raced = await Indicator.findOneAndUpdate(
        { pattern },
        { $inc: { lastNumber: 1 } },
        { new: true }
      );
      if (raced) return raced;
    }
    throw err;
  }
}

async function releaseCertificateNumber(yearKey) {
  await Indicator.updateOne(
    { pattern: `CERT-${yearKey}` },
    { $inc: { lastNumber: -1 } }
  );
}

/**
 * Builds the certificate number as [year][courseCode][issueNumber]:
 *   - year:       last 3 digits of the Jalali issuance year (e.g. 1405 -> 405)
 *   - courseCode: the course's unique 5-digit code
 *   - issueNumber: global-per-year sequence, zero-padded to 4 (0001...)
 * e.g. 405 + 12345 + 0001 = 405123450001
 */
export async function processCertificateGeneration({ enrollment, user, course }) {
  const nowFa = new DateObject({ calendar: persian });
  const issuedAt = nowFa.format("YYYY/MM/DD");
  const yearKey = String(nowFa.year % 1000).padStart(3, "0");

  const courseCode = String(course.courseCode || "");
  if (!/^\d{5}$/.test(courseCode)) {
    throw new Error(
      "این دوره کد ۵ رقمی معتبر ندارد. لطفاً کد دوره را با «bun run assign:course-codes» تنظیم کنید."
    );
  }

  const enrollmentId = enrollment._id.toString();

  const indicator = await reserveCertificateNumber(yearKey);
  const nextNumber = indicator.lastNumber;

  if (nextNumber > INDICATOR_MAX_NUMBER) {
    await releaseCertificateNumber(yearKey);
    throw new Error(
      `Certificate number capacity for year ${yearKey} has been reached.`
    );
  }

  const certNumber = `${yearKey}${courseCode}${String(nextNumber).padStart(4, "0")}`;

  try {
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
        courseId: course._id,
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
      issuedAt,
      certificationId: enrollmentId,
      qr_url: `${getSiteUrl()}/verify/${enrollmentId}`,
    };

    const microserviceResponse = await triggerCertificateGeneration(
      dataForMicroservice
    );

    await IndicatorUsage.create({
      indicator: indicator._id,
      number: nextNumber,
      enrollment: enrollmentId,
      fullCertificateId: certNumber,
    });

    return {
      jobId: microserviceResponse.job_id,
      issuedAt,
      certificateUniqueId: certNumber,
      certificateUrl: `/verify/${enrollmentId}`,
    };
  } catch (error) {
    await releaseCertificateNumber(yearKey);
    throw error;
  }
}
