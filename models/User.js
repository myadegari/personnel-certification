// File: models/User.js
import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    personnelNumber: {
      type: String,
      required: [true, "شماره پرسنلی الزامی است."],
      unique: true,
    },
    nationalId: {
      type: String,
      required: [true, "کد ملی الزامی است."],
      unique: true,
    },
    firstName: {
      type: String,
      required: [true, "نام الزامی است."],
    },
    lastName: {
      type: String,
      required: [true, "نام خانوادگی الزامی است."],
    },
    gender: {
      type: String,
      enum: ["Male", "Female"],
      required: true,
    },
    email: {
      type: String,
      required: [true, "ایمیل الزامی است."],
      unique: true,
    },
    password: {
      type: String,
      required: [true, "رمز عبور الزامی است."],
    },
    position: { type: String },
    signatureImage: { type: mongoose.Schema.Types.ObjectId, ref: "File" },
    // Organizational deputy (معاونت) this user belongs to.
    deputy: { type: mongoose.Schema.Types.ObjectId, ref: "Deputy" },
    // For DEPUTY_HEAD users: the deputy they lead.
    headedDeputy: { type: mongoose.Schema.Types.ObjectId, ref: "Deputy" },
    role: {
      type: String,
      enum: ["USER", "DEPUTY_HEAD", "ADMIN", "SUPERADMIN"],
      default: "USER",
    },
    status: {
      type: String,
      enum: ["PENDING", "NEED_TO_VERIFY", "VERIFIED", "REJECTED"],
      default: "PENDING",
    },
    otp: {
      type: String,
    },
    otpExpires: {
      type: Date,
    },
    // --- ADD THESE TWO FIELDS ---
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    // Offline password-reset workflow (no email OTP): a user can flag that they
    // forgot their password (passwordResetRequested), an admin then issues a
    // temporary password which sets mustChangePassword; the user is forced to
    // choose a new password on next login before anything else works.
    passwordResetRequested: { type: Boolean, default: false },
    passwordResetRequestedAt: { type: Date },
    mustChangePassword: { type: Boolean, default: false },
    isProfessor : { type: Boolean },
  },
  { timestamps: true }
);

// Delete pending users who are older than one week
UserSchema.index(
  { createdAt: 1 },
  {
    expireAfterSeconds: 7 * 24 * 3600,
    partialFilterExpression: { status: "PENDING" },
  }
);
// Password-reset lookups happen on a public endpoint; keep them indexed.
UserSchema.index({ resetPasswordToken: 1 }, { sparse: true });
// Admin badge counts + filtering for the offline reset workflow.
UserSchema.index({ passwordResetRequested: 1 }, { sparse: true });
UserSchema.index({ mustChangePassword: 1 }, { sparse: true });
// UserSchema.index(
//   { createdAt: 1 },
//   {
//     expireAfterSeconds: 24 * 3600,
//     partialFilterExpression: { status: "REJECTED" },
//   }
// );

export default mongoose.models.User || mongoose.model("User", UserSchema);
