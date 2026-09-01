import Indicator from "@/models/Indicator";
import IndicatorUsage from "@/models/IndicatorUsage";
import Course from "@/models/Course";
import Deputy from "@/models/Deputy";
import { microserviceAxios } from "@/lib/axios";
import { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
// Certificate number = [year3][deputy2][course2][issue3] (10 digits)
//  - year:    last 3 digits of the Jalali issuance year (1405 -> 405)
//  - deputy:  2-digit deputy sequence (Deputy.number)
//  - course:  2-digit per-deputy course sequence (Course.courseSeq)
//  - issue:   3-digit per-course sequence (per-certificate)
export const DEPUTY_SEQ_MAX = 99;
export const COURSE_ISSUE_MAX = 999;

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
 * Atomically reserves the next sequence number for a counter. The counter
 * lives in the shared Indicator collection under `pattern` and is seeded so
 * the first reserved number is 1.
 */
async function reserveIndicator(pattern) {
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

async function releaseIndicator(pattern, number) {
  // Compare-and-set: only roll the counter back while `number` is still the
  // highest one reserved. Decrementing blindly would let the number be issued
  // again and collide with the unique {indicator, number} index on
  // IndicatorUsage (or worse, duplicate a certificate number). When another
  // reservation has already advanced the counter, the released number simply
  // becomes a permanent gap.
  await Indicator.updateOne(
    { pattern, lastNumber: number },
    { $inc: { lastNumber: -1 } }
  );
}

/**
 * Resolves the course's deputy to a document carrying a `number`. Accepts
 * either a populated deputy or a raw ObjectId (callers usually pass a lean
 * course where deputy is not populated).
 */
async function resolveDeputy(course) {
  const ref = course?.deputy;
  if (!ref) return null;
  if (typeof ref === "object" && ref.number != null) return ref;
  return Deputy.findById(ref).lean();
}

/**
 * Returns the stable 2-digit per-deputy course sequence for `course`,
 * assigning it atomically on first use. Two concurrent first-issues for the
 * same course can't both claim a number: the loser of the findOneAndUpdate
 * race releases its reservation and re-reads the winner's value.
 */
async function ensureCourseSequence(course, deputy) {
  const courseId = course._id.toString();
  const deputyId = String(deputy._id);

  if (course.courseSeq != null && String(course.courseSeqDeputy || "") === deputyId) {
    return Number(course.courseSeq);
  }

  const pattern = `CERT-D${String(deputy.number).padStart(2, "0")}`;
  const indicator = await reserveIndicator(pattern);
  const seq = indicator.lastNumber;
  if (seq > DEPUTY_SEQ_MAX) {
    await releaseIndicator(pattern, seq);
    throw new Error(
      `ظرفیت شماره دوره‌های این معاونت (تا ۹۹) تکمیل شده است. (capacity)`
    );
  }

  const claimed = await Course.findOneAndUpdate(
    {
      _id: courseId,
      $or: [{ courseSeq: { $exists: false } }, { courseSeqDeputy: { $ne: deputyId } }],
    },
    { $set: { courseSeq: seq, courseSeqDeputy: deputy._id } },
    { new: true }
  );

  if (claimed) return seq;

  // Lost the race (or the course already carries a number for this deputy):
  // release our reservation and reuse the stored value.
  await releaseIndicator(pattern, seq);
  const fresh = await Course.findById(courseId).select("courseSeq").lean();
  if (fresh?.courseSeq != null) return Number(fresh.courseSeq);
  throw new Error("تعیین شماره دوره با خطا مواجه شد؛ دوباره تلاش کنید.");
}

/**
 * Builds the 10-digit certificate number [year][deputy][course][issue] and
 * hands the payload to the certificate microservice:
 *   - year:   last 3 digits of the Jalali issuance year (e.g. 1405 -> 405)
 *   - deputy: the course's deputy 2-digit number
 *   - course: per-deputy course sequence (stable, assigned on first issue)
 *   - issue:  per-course sequence, zero-padded to 3 (001...)
 * e.g. 405 + 01 + 02 + 003 = 4050102003
 */
export async function processCertificateGeneration({ enrollment, user, course, guestCertificate = null }) {
  const nowFa = new DateObject({ calendar: persian });
  const issuedAt = nowFa.format("YYYY/MM/DD");
  const yearKey = String(nowFa.year % 1000).padStart(3, "0");

  const courseCode = String(course.courseCode || "");
  if (!/^\d{5}$/.test(courseCode)) {
    throw new Error(
      "این دوره کد ۵ رقمی معتبر ندارد. لطفاً کد دوره را با «bun run assign:course-codes» تنظیم کنید."
    );
  }

  // The certificate pipeline dereferences the signatory unconditionally, and
  // the schema keeps it optional (creation happens before signatory setup).
  // Fail BEFORE any sequence number is reserved.
  if (!course?.signatory) {
    throw new Error(
      "این دوره فاقد امضاکننده است. ابتدا امضاکننده را در ویرایش دوره تنظیم کنید."
    );
  }

  // Deputy is mandatory: it is embedded in the certificate number.
  const deputy = await resolveDeputy(course);
  if (!deputy?.number) {
    throw new Error(
      "این دوره فاقد معاونت است. ابتدا معاونت را در ویرایش دوره تنظیم کنید."
    );
  }

  const courseId = course._id.toString();
  const deputyPart = String(deputy.number).padStart(2, "0");

  // Stable per-deputy course sequence (assigned once; not released on later
  // failure because it is a stable attribute of the course).
  const courseSeq = await ensureCourseSequence(course, deputy);
  const coursePart = String(courseSeq).padStart(2, "0");

  // Per-course issue sequence (released on failure, CAS).
  const issuePattern = `CERT-C${courseId}`;
  const issueIndicator = await reserveIndicator(issuePattern);
  const issueSeq = issueIndicator.lastNumber;
  if (issueSeq > COURSE_ISSUE_MAX) {
    await releaseIndicator(issuePattern, issueSeq);
    throw new Error(
      `ظرفیت شماره گواهی‌های این دوره (تا ۹۹۹) تکمیل شده است. (capacity)`
    );
  }

  const certNumber = `${yearKey}${deputyPart}${coursePart}${String(issueSeq).padStart(3, "0")}`;

  // certificationId must be a 24-hex ObjectId (pydantic validation). For
  // guest certificates we use the guest's own _id (which is an ObjectId).
  const certificationId = guestCertificate
    ? guestCertificate._id.toString()
    : enrollment._id.toString();

  try {
    const dataForMicroservice = {
      category: course.signatory2 ? "2" : "1",
      user: {
        userId: user._id || null,
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
      certificationId,
      qr_url: `${getSiteUrl()}/verify/${certificationId}`,
    };

    const microserviceResponse = await triggerCertificateGeneration(
      dataForMicroservice
    );

    const usageData = {
      indicator: issueIndicator._id,
      number: issueSeq,
      fullCertificateId: certNumber,
    };
    if (enrollment) usageData.enrollment = enrollment._id;
    if (guestCertificate) usageData.guestCertificate = guestCertificate._id;
    await IndicatorUsage.create(usageData);

    return {
      jobId: microserviceResponse.job_id,
      issuedAt,
      certificateUniqueId: certNumber,
      certificateUrl: `/verify/${certificationId}`,
    };
  } catch (error) {
    await releaseIndicator(issuePattern, issueSeq);
    throw error;
  }
}
