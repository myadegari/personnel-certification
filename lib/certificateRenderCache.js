// Transient, in-process cache of rendered certificate PDFs.
//
// Certificates are generated on demand and intentionally never persisted to
// storage/DB. This cache only avoids re-running the (slow) LibreOffice render
// for repeat views within a short window. It is per-process (fine for the
// single dev server / single nextjs container) and holds bytes in memory only.

const TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ENTRIES = 50;

const store = new Map(); // certificationId -> { bytes, expires }

export function getRenderedCertificate(certificationId) {
  const hit = store.get(certificationId);
  if (!hit) return null;
  if (Date.now() > hit.expires) {
    store.delete(certificationId);
    return null;
  }
  // Refresh recency for LRU eviction.
  store.delete(certificationId);
  store.set(certificationId, hit);
  return hit.bytes;
}

export function setRenderedCertificate(certificationId, bytes) {
  if (store.size >= MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest !== undefined) store.delete(oldest);
  }
  store.set(certificationId, { bytes, expires: Date.now() + TTL_MS });
}

export function clearRenderedCertificate(certificationId) {
  store.delete(certificationId);
}
