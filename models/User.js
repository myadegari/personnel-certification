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
    // --- ADD THESE TWO FIELDS ---
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", UserSchema);
