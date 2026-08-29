// In-memory per-IP token bucket for protecting public endpoints.
// Best-effort: state is per-process (fine for the single nextjs container).
// For multi-instance deployments, swap the store for Redis.

const BUCKETS = new Map();
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

/**
 * @param {Request} request
 * @param {{limit: number, windowMs: number, key?: string}} options
 * @returns {boolean} true if the request is allowed
 */
export function rateLimit(request, { limit, windowMs, key = "global" }) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = (forwarded ? forwarded.split(",")[0] : null) || "unknown";
  const bucketKey = `${key}:${ip}`;
  const now = Date.now();

  maybeCleanup(now);

  let bucket = BUCKETS.get(bucketKey);
  if (!bucket || now - bucket.start > windowMs) {
    bucket = { start: now, count: 0 };
    BUCKETS.set(bucketKey, bucket);
  }

  bucket.count += 1;
  return bucket.count <= limit;
}

function maybeCleanup(now) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, bucket] of BUCKETS) {
    if (now - bucket.start > 10 * 60 * 1000) BUCKETS.delete(key);
  }
}
