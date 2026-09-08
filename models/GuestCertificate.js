import mongoose from "mongoose";

// A certificate issued to a person with no account in the system (bulk Excel
// issuance by a deputy head). Its `_id` doubles as the certificate
// `certificationId`/`jobId` sent to the microservice, so:
//   - the File record stores metadata.job_id = this._id (24-hex ObjectId) and
//   - the public /verify/<id> route resolves it with no special-casing.
const GuestCertificateSchema = new mongoose.Schema(
  {
    // 11-digit certificate number [year3][deputy2][course2][issue4].
    // Set after the microservice returns the number (the guest record is
    // created first so its _id can serve as the certificationId/jobId).
    certificateNumber: {
      type: String,
      unique: true,
      sparse: true,
    },
    fullName: { type: String, required: true, trim: true },
    nationalId: { type: String, required: true, trim: true },
    // Gender is rendered as the honorific on the certificate template.
    gender: { type: String, enum: ["Male", "Female"], required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    // The deputy-head user who issued this certificate.
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // Worker job lifecycle (mirrored from the status webhook).
    jobId: { type: String },
    fileId: { type: mongoose.Schema.Types.ObjectId, ref: "File", default: null },
    certificateStatus: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
    },
    issuedAt: { type: String },
    certificateUrl: { type: String },
  },
  { timestamps: true }
);

GuestCertificateSchema.index({ nationalId: 1, course: 1 });
GuestCertificateSchema.index({ course: 1, certificateStatus: 1 });
GuestCertificateSchema.index({ jobId: 1 });

export default mongoose.models.GuestCertificate ||
  mongoose.model("GuestCertificate", GuestCertificateSchema);
