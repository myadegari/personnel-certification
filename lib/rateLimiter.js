const ipHits = new Map();

const WINDOW_MS = 60 * 1000;
const MAX_HITS = 10;

setInterval(() => {
  const now = Date.now();
  for (const [key, { timestamps }] of ipHits) {
    const valid = timestamps.filter(t => now - t < WINDOW_MS);
    if (valid.length === 0) ipHits.delete(key);
    else ipHits.set(key, { timestamps: valid });
  }
}, 60 * 1000);

export function rateLimit(request, maxHits = MAX_HITS, windowMs = WINDOW_MS) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
  const now = Date.now();
  const key = `${ip}:${request.url}`;

  let entry = ipHits.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    ipHits.set(key, entry);
  }

  entry.timestamps = entry.timestamps.filter(t => now - t < windowMs);

  if (entry.timestamps.length >= maxHits) {
    return false;
  }

  entry.timestamps.push(now);
  return true;
}