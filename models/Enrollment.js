import mongoose from "mongoose";

const EnrollmentSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // ارجاع به مدل User
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course", // ارجاع به مدل Course
      required: true,
    },
    certificateUniqueId: { type: String },
    certificateUrl: { type: String },
    issuedAt: { type: String },
    jobId: { type: String },
    // Certificate generation lifecycle, mirrored from the worker's status
    // webhook (with a MongoDB job_statuses fallback). Drives the SSE stream.
    certificateStatus: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: null,
    },
    certificateFileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "File",
      default: null,
    },
    // Free-form metadata (e.g. courseStatus: "PERISH" when the parent
    // course is deleted) - written by admin course DELETE.
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

// جلوگیری از ثبت‌نام مجدد یک کاربر در یک دوره
EnrollmentSchema.index({ user: 1, course: 1 }, { unique: true });
// سریع‌ترین جست‌وجو برای وب‌هوک وضعیت (پیدا کردن ثبت‌نام بر اساس jobId)
EnrollmentSchema.index({ jobId: 1 });
// Course-scoped listings + capacity checks and per-user course lists.
EnrollmentSchema.index({ course: 1, status: 1 });
EnrollmentSchema.index({ user: 1, status: 1 });
// Dashboard "certificates issued" count.
EnrollmentSchema.index({ certificateStatus: 1 });

// Soft-delete marker written when the parent course is deleted. Reads MUST
// include this filter so enrollments of deleted courses never surface.
export const LIVE_ENROLLMENT_FILTER = {
  "metadata.courseStatus": { $ne: "PERISH" },
};

export default mongoose.models.Enrollment ||
  mongoose.model("Enrollment", EnrollmentSchema);
