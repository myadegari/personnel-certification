import {
  S3Client,
  HeadBucketCommand,
  CreateBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Storage client for Alarik (S3-compatible object storage).
 *
 * Required environment variables:
 *   STORAGE_ENDPOINT   - internal API endpoint, e.g. http://alarik:8080
 *   STORAGE_REGION     - must exactly match the server's ALARIK_REGION
 *                        (Alarik rejects requests signed for any other region)
 *   STORAGE_ACCESS_KEY - S3 access key (DEFAULT_ACCESS_KEY in Alarik)
 *   STORAGE_SECRET_KEY - S3 secret key (DEFAULT_SECRET_KEY in Alarik)
 *   STORAGE_PUBLIC_URL - optional public base URL used to rewrite presigned
 *                        URLs so browsers can reach them through nginx.
 */

const endpoint = process.env.STORAGE_ENDPOINT;
const region = process.env.STORAGE_REGION || "us-east-1";
const accessKeyId = process.env.STORAGE_ACCESS_KEY;
const secretAccessKey = process.env.STORAGE_SECRET_KEY;

if (!endpoint || !accessKeyId || !secretAccessKey) {
  throw new Error(
    "Missing storage configuration: STORAGE_ENDPOINT, STORAGE_ACCESS_KEY and STORAGE_SECRET_KEY must be set."
  );
}

const storageClient = new S3Client({
  endpoint,
  region,
  // Alarik (like MinIO) is addressed via path-style URLs: /bucket/object
  forcePathStyle: true,
  credentials: { accessKeyId, secretAccessKey },
});

const INTERNAL_BASE = endpoint.replace(/\/+$/, "");
const PUBLIC_BASE = process.env.STORAGE_PUBLIC_URL?.replace(/\/+$/, "");

/** Rewrites an internally-generated presigned URL to its public counterpart. */
function toPublicStorageUrl(url) {
  if (!PUBLIC_BASE || !url.startsWith(INTERNAL_BASE)) return url;
  return PUBLIC_BASE + url.slice(INTERNAL_BASE.length);
}

/** Creates the bucket if it does not exist yet. */
export async function ensureBucket(bucket) {
  try {
    await storageClient.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch (err) {
    const status = err?.$metadata?.httpStatusCode;
    if (status === 404 || err.name === "NoSuchBucket" || err.name === "NotFound") {
      await storageClient.send(new CreateBucketCommand({ Bucket: bucket }));
      return;
    }
    throw err;
  }
}

export async function putBuffer({ bucket, objectName, buffer, contentType }) {
  await storageClient.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: objectName,
      Body: buffer,
      ContentType: contentType,
    })
  );
}

/** Generates a presigned download URL, rewritten to the public base URL. */
export async function getPresignedUrl({ bucket, objectName, expiresInSeconds }) {
  const url = await getSignedUrl(
    storageClient,
    new GetObjectCommand({ Bucket: bucket, Key: objectName }),
    { expiresIn: expiresInSeconds }
  );
  return toPublicStorageUrl(url);
}

/** Downloads an object fully into a Buffer. */
export async function getObjectBuffer({ bucket, objectName }) {
  const response = await storageClient.send(
    new GetObjectCommand({ Bucket: bucket, Key: objectName })
  );
  const bytes = await response.Body.transformToByteArray();
  return Buffer.from(bytes);
}
