import File from "@/models/File";
import { ensureBucket, putBuffer, getPresignedUrl } from "@/lib/storage";
import { readValidatedImage } from "@/lib/uploadValidation";

export async function uploadUserSignature(user, file) {
  if (!user) throw new Error("User is required");
  if (!file) throw new Error("File is required");

  const validated = await readValidatedImage(file);
  if (validated.error) {
    const err = new Error(validated.error);
    err.status = validated.status;
    throw err;
  }

  const { buffer, mimeType, extension } = validated;
  const bucketName = "signature";
  const objectName = `${user.personnelNumber}/signature-${user.personnelNumber}${extension}`;

  await ensureBucket(bucketName);

  await putBuffer({
    bucket: bucketName,
    objectName,
    buffer,
    contentType: mimeType,
  });

  const expirySeconds = 7 * 24 * 60 * 60;
  const presignedUrl = await getPresignedUrl({
    bucket: bucketName,
    objectName,
    expiresInSeconds: expirySeconds,
  });
  const expiresAt = new Date(Date.now() + expirySeconds * 1000);

  let fileRecord = await File.findOne({ objectName });

  if (fileRecord) {
    fileRecord.userId = user._id;
    fileRecord.originalName = file.name;
    fileRecord.mimeType = mimeType;
    fileRecord.size = buffer.length;
    fileRecord.presignedUrl = presignedUrl;
    fileRecord.expiresAt = expiresAt;
    await fileRecord.save();
  } else {
    fileRecord = await File.create({
      userId: user._id,
      bucket: bucketName,
      objectName,
      originalName: file.name,
      mimeType,
      size: buffer.length,
      presignedUrl,
      expiresAt,
    });
  }

  user.signatureImage = fileRecord._id;
  await user.save();

  return fileRecord;
}
