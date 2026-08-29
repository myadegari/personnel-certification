// models/AuditLog.js
// Unified audit trail: every state-changing user/admin action plus auth
// events. Auto-expires after 90 days via a TTL index.
import mongoose from "mongoose";

const AUDIT_RETENTION_SECONDS = 90 * 24 * 3600;

const AuditLogSchema = new mongoose.Schema(
  {
    // Null for system-originated events (e.g. worker callbacks) where no
    // session exists.
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    actorName: { type: String, default: null },
    actorRole: { type: String, default: null },
    // Free string (not a schema enum) so introducing a new action can never
    // make an audit write fail. The constant list lives in lib/audit.js.
    action: { type: String, required: true, index: true },
    resourceType: { type: String, default: null },
    resourceId: { type: String, default: null },
    // Small structured details (ids, statuses, counts) — never request bodies
    // or secrets; lib/audit.js redacts before insert.
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
  },
  { timestamps: true }
);

// Viewer queries: newest-first lists filtered by time/actor/action/resource.
AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ actorId: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ resourceType: 1, resourceId: 1 });

// Retention: auto-delete entries older than the retention window.
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: AUDIT_RETENTION_SECONDS });

const AuditLog =
  mongoose.models.AuditLog || mongoose.model("AuditLog", AuditLogSchema);

export default AuditLog;
