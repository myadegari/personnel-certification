import mongoose from "mongoose";

const ImpersonationLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    actorName: { type: String },
    actorRole: { type: String },
    targetId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    targetName: { type: String },
    targetRole: { type: String },
    action: { type: String, enum: ["START", "END"], required: true },
  },
  { timestamps: true }
);

// Audit list is always sorted by recency with pagination.
ImpersonationLogSchema.index({ createdAt: -1 });

const ImpersonationLog =
  mongoose.models.ImpersonationLog ||
  mongoose.model("ImpersonationLog", ImpersonationLogSchema);

export default ImpersonationLog;
