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
    profileImage: { type: mongoose.Schema.Types.ObjectId, ref: "File" },
    signatureImage: { type: mongoose.Schema.Types.ObjectId, ref: "File" },
    role: {
      type: String,
      enum: ["USER", "ADMIN"],
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
// UserSchema.index(
//   { createdAt: 1 },
//   {
//     expireAfterSeconds: 24 * 3600,
//     partialFilterExpression: { status: "REJECTED" },
//   }
// );

export default mongoose.models.User || mongoose.model("User", UserSchema);
