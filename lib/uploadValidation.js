export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function matchesImageSignature(buffer, mimeType) {
  const b = buffer;
  if (mimeType === "image/jpeg") {
    return b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return (
      b.length > 8 &&
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47
    );
  }
  if (mimeType === "image/webp") {
    return (
      b.length > 12 &&
      b.toString("ascii", 0, 4) === "RIFF" &&
      b.toString("ascii", 8, 12) === "WEBP"
    );
  }
  return false;
}

export async function readValidatedImage(file) {
  if (!file) {
    return { error: "File is required", status: 400 };
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return { error: "File is too large. Maximum allowed size is 5 MB.", status: 413 };
  }

  const mimeType = file.type || "";
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return { error: "Only JPEG, PNG or WebP images are allowed.", status: 415 };
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  if (!matchesImageSignature(buffer, mimeType)) {
    return { error: "File content does not look like a valid image.", status: 415 };
  }

  const extension = file.name?.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";

  return { buffer, mimeType, extension };
}
