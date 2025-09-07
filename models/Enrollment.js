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
    certificateUrl: { type: mongoose.Schema.Types.ObjectId, ref: "File" },
    issuedAt: { type: String },
    jobId: { type: String },
  },
  { timestamps: true }
);

// جلوگیری از ثبت‌نام مجدد یک کاربر در یک دوره
EnrollmentSchema.index({ user: 1, course: 1 }, { unique: true });

export default mongoose.models.Enrollment ||
  mongoose.model("Enrollment", EnrollmentSchema);
