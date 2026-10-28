import File from "@/models/File";
import { ensureBucket, putBuffer, getPresignedUrl } from "@/lib/storage";
import { readValidatedImage } from "@/lib/uploadValidation";

/** Presigned-URL lifetime for stored uploads (stamps, signatures, media). */
export const PRESIGN_EXPIRY_SECONDS = 7 * 24 * 60 * 60;

/**
 * Shared upload pipeline: validate the image, put it in its bucket, presign
 * a fresh URL, and upsert the File record (keyed on objectName so replacing
 * a stamp/signature updates the same document instead of duplicating it).
 *
 * Domain-specific extras (title/alt, course references, audit events) stay
 * with the callers; this service owns only the storage + File plumbing.
 *
 * @param {object} p
 * @param {object} p.file          FormData File to upload.
 * @param {string} p.bucket        Target bucket ("stamp" | "signature" | "media").
 * @param {string} p.objectNameBase Object key without extension; the
 *   validated file's extension is appended (".png", ".jpg", ...).
 * @param {any}    [p.userId]      Uploader reference stored on the File record.
 * @param {object} [p.extra]       Additional File fields (title, alt, courseId...).
 * @param {boolean} [p.upsert=true] Update an existing File with the same
 *   objectName. Set false for always-create keys (e.g. UUID media names).
 * @returns {Promise<{fileRecord: object, objectName: string, presignedUrl: string, mimeType: string, extension: string}>}
 * @throws {Error} With `.status` when validation or storage fails.
 */
export async function uploadValidatedFile({
  file,
  bucket,
  objectNameBase,
  userId,
  extra = {},
  upsert = true,
}) {
  const validated = await readValidatedImage(file);
  if (validated.error) {
    const err = new Error(validated.error);
    err.status = validated.status;
    throw err;
  }

  const { buffer, mimeType, extension } = validated;
  const objectName = `${objectNameBase}${extension}`;

  await ensureBucket(bucket);
  await putBuffer({ bucket, objectName, buffer, contentType: mimeType });

  const presignedUrl = await getPresignedUrl({
    bucket,
    objectName,
    expiresInSeconds: PRESIGN_EXPIRY_SECONDS,
  });
  const expiresAt = new Date(Date.now() + PRESIGN_EXPIRY_SECONDS * 1000);

  const shared = {
    userId,
    bucket,
    objectName,
    originalName: file.name,
    mimeType,
    size: buffer.length,
    presignedUrl,
    expiresAt,
    ...extra,
  };

  if (upsert) {
    let fileRecord = await File.findOne({ objectName });
    if (fileRecord) {
      Object.assign(fileRecord, shared);
      await fileRecord.save();
      return { fileRecord, objectName, presignedUrl, mimeType, extension };
    }
  }

  const fileRecord = await File.create(shared);
  return { fileRecord, objectName, presignedUrl, mimeType, extension };
}
