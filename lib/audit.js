// lib/audit.js
// Central audit helper: records state-changing actions into the AuditLog
// collection. Logging must NEVER break the underlying user action, so every
// failure is swallowed (and logged server-side).
import AuditLog from "@/models/AuditLog";
import {
  AUDIT_ACTIONS,
  AUDIT_ACTION_LABELS_FA,
  AUDIT_RESOURCE_TYPES,
  AUDIT_RESOURCE_LABELS_FA,
} from "@/lib/auditConstants";

export {
  AUDIT_ACTIONS,
  AUDIT_ACTION_LABELS_FA,
  AUDIT_RESOURCE_TYPES,
  AUDIT_RESOURCE_LABELS_FA,
} from "@/lib/auditConstants";

const SENSITIVE_KEY_PATTERN = /(password|token|secret|presigned|authorization)/i;

function sanitizeMetadata(metadata) {
  if (metadata == null) return {};
  if (typeof metadata !== "object") return { value: metadata };
  const clean = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) continue;
    clean[key] = value;
  }
  return clean;
}

export function getClientIp(request) {
  if (!request?.headers) return null;
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || null;
}

function actorFromSession(session) {
  const u = session?.user;
  if (!u) return {};
  return { actorId: u.id || null, actorName: u.name || null, actorRole: u.role || null };
}

/**
 * Record one audit event. Safe by design: any failure is swallowed so it can
 * never break the user action being audited.
 *
 * Pass EITHER `session` (a NextAuth session) OR an explicit `actor` object
 * ({ id, name, role }) for contexts without a session (NextAuth events,
 * worker callbacks).
 *
 * @param {object} params
 * @param {Request}  [params.request]   - for ip/userAgent (absent in NextAuth events)
 * @param {object}   [params.session]   - NextAuth session
 * @param {object}   [params.actor]     - { id, name, role } explicit actor override
 * @param {string}   params.action      - one of AUDIT_ACTIONS
 * @param {string}   [params.resourceType]
 * @param {string|ObjectId} [params.resourceId]
 * @param {object}   [params.metadata]  - small structured details (redacted)
 */
export async function recordAuditEvent({
  request,
  session,
  actor,
  action,
  resourceType = null,
  resourceId = null,
  metadata = {},
}) {
  try {
    const fromSession = actorFromSession(session);
    const a = {
      actorId: actor?.id ?? fromSession.actorId ?? null,
      actorName: actor?.name ?? fromSession.actorName ?? null,
      actorRole: actor?.role ?? fromSession.actorRole ?? null,
    };

    await AuditLog.create({
      actorId: a.actorId,
      actorName: a.actorName,
      actorRole: a.actorRole,
      action,
      resourceType,
      resourceId: resourceId != null ? String(resourceId) : null,
      metadata: sanitizeMetadata(metadata),
      ip: getClientIp(request),
      userAgent: request?.headers?.get("user-agent") || null,
    });
  } catch (err) {
    console.error(`Audit log failed for action ${action}:`, err?.message || err);
  }
}
