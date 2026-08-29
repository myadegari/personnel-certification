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
      enum: ["signature", "stamp", "certificate", "media"],
    },
    objectName: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      default: "",
    },
    alt: {
      type: String,
      default: "",
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

// Hot lookups: the public verify endpoint and the SSE status poll resolve
// certificates by the worker-written job id; the admin media list pages by
// bucket/date; upload dedupe checks objectName.
// NOTE: the unique job_id index requires certificate File records to be
// deduped first (scripts/dedupe-certificate-files.js).
fileSchema.index({ "metadata.job_id": 1, bucket: 1 }, { unique: true });
fileSchema.index({ bucket: 1, createdAt: -1 });
fileSchema.index({ objectName: 1 });

// ✅ Rename variable to avoid conflict with global File
const File = mongoose.models.File || mongoose.model('File', fileSchema);
export default File; // 👈 Export as File
