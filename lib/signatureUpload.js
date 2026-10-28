import { uploadValidatedFile } from "@/lib/uploadService";

/**
 * Upload (or replace) a user's signature image and link it on the user.
 * Storage + File-record plumbing lives in uploadService; this keeps only
 * the signature-specific key layout and the user.signatureImage link.
 */
export async function uploadUserSignature(user, file) {
  if (!user) throw new Error("User is required");
  if (!file) throw new Error("File is required");

  const base = `${user.personnelNumber}/signature-${user.personnelNumber}`;

  const { fileRecord } = await uploadValidatedFile({
    file,
    bucket: "signature",
    objectNameBase: base,
    userId: user._id,
  });

  user.signatureImage = fileRecord._id;
  await user.save();

  return fileRecord;
}
