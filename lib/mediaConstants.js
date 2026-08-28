export const BUCKET_LABELS_FA = {
  media: "کتابخانه",
  stamp: "مهر",
  signature: "امضا",
  certificate: "گواهی",
  report: "گزارش",
};

// System-generated media that must never be deleted (public verification +
// certificate generation depend on these records).
export const PROTECTED_BUCKETS = new Set(["certificate", "report"]);

export function classifyKind(mimeType = "") {
  return String(mimeType).startsWith("image/") ? "image" : "other";
}
