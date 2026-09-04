import mongoose from "mongoose";

// A certificate is no longer stored as a generated PDF file. Instead, at
// issuance we persist the complete render-data snapshot here; the PDF is
// produced on demand (verify/download) from this data and never saved.
//
// `certificationId` is the stable public key: the Enrollment _id for account
// holders, or the GuestCertificate _id for guest certificates. It matches the
// id embedded in the certificate QR (/verify/<certificationId>).
const CertificateSchema = new mongoose.Schema(
  {
    certificationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    kind: {
      type: String,
      enum: ["enrollment", "guest"],
      required: true,
    },
    // 10-digit certificate number [year3][deputy2][course2][issue3].
    certificateNumber: { type: String, required: true },
    // Jalali "YYYY/MM/DD" printed on the certificate.
    issuedAt: { type: String, required: true },
    // Full payload required to re-render the PDF (see buildCertificateRenderData).
    data: { type: mongoose.Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: ["issued"],
      default: "issued",
    },
  },
  { timestamps: true }
);

export default mongoose.models.Certificate ||
  mongoose.model("Certificate", CertificateSchema);
