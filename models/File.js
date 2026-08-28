// models/File.js
import mongoose from "mongoose";

const fileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: false, // only required for stamps
    },
    bucket: {
      type: String,
      required: true,
      enum: ["profile", "signature", "stamp", "certificate", "report"],
    },
    objectName: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    presignedUrl: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    // Arbitrary storage metadata (e.g. { job_id, type } for generated
    // certificates) - queried by the public /api/verify/[id] endpoint.
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

// ✅ Rename variable to avoid conflict with global File
const File = mongoose.models.File || mongoose.model('File', fileSchema);
export default File; // 👈 Export as File
