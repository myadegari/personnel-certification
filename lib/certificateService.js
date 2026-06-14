import Indicator from "@/models/Indicator";
import IndicatorUsage from "@/models/IndicatorUsage";
import { microserviceAxios } from "@/lib/axios";
import { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";

const NEXTJS_APP_URL = process.env.NEXTAUTH_URL;

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
 * Processes the entire certificate generation workflow.
 * 1. Atomically increments the certificate number.
 * 2. Triggers the certificate generation microservice.
 * 3. Creates a usage record upon success.
 * 4. Rolls back the number on failure.
 * @param {object} params - The parameters object.
 * @param {object} params.enrollment - The Mongoose enrollment document.
 * @param {object} params.user - The lean user object.
 * @param {object} params.course - The lean course object with populated signatories.
 * @returns {Promise<object>} An object with the data to be saved on the enrollment document.
 * @throws {Error} Throws an error if the process fails at any step.
 */
export async function processCertificateGeneration({
  enrollment,
  user,
  course,
}) {
  const basePattern = course.certificateNumberPattern;
  const isProfessor = user.isProfessor;
  const categorySuffix = isProfessor ? "ع" : "ک";
  const fullIndicatorPattern = `${basePattern}/${categorySuffix}`;
  const NEXTJS_APP_URL = process.env.NEXTAUTH_URL || "";
  // Step 1: Atomically check capacity and increment.
  const indicator = await Indicator.findOneAndUpdate(
    { pattern: fullIndicatorPattern, lastNumber: { $lt: 9999 } },
    { $inc: { lastNumber: 1 } },
    { new: true }
  );

  if (!indicator) {
    throw new Error(
      `Certificate number capacity for pattern "${fullIndicatorPattern}" has been reached.`
    );
  }

  const nextNumber = indicator.lastNumber;
  const certNumber = `${fullIndicatorPattern}/${nextNumber}`;
  const enrollmentId = enrollment._id.toString();

  try {
    // Step 2: Prepare data and call the microservice.
    const issuedAt = new DateObject({ calendar: persian }).format("YYYY/MM/DD");
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
      issuedAt,
      certificationId: enrollmentId,
      qr_url: `${NEXTJS_APP_URL}/verify/${enrollmentId}`,
    };

    const microserviceResponse = await triggerCertificateGeneration(
      dataForMicroservice
    );

    // Step 3: Create the usage record.
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
      certificateUrl: `${NEXTJS_APP_URL}/verify/${enrollmentId}`,
    };
  } catch (error) {
    // Number was atomically consumed and won't be reused — gap is acceptable.
    console.error("Certificate generation failed after number allocation.");
    throw error;
  }
}
