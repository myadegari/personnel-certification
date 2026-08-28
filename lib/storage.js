import {
  S3Client,
  DeleteObjectCommand,
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

let storageClient;

/** Lazily created so `next build` can evaluate modules without storage env. */
function getClient() {
  if (!storageClient) {
    if (!endpoint || !accessKeyId || !secretAccessKey) {
      throw new Error(
        "Missing storage configuration: STORAGE_ENDPOINT, STORAGE_ACCESS_KEY and STORAGE_SECRET_KEY must be set."
      );
    }
    storageClient = new S3Client({
      endpoint,
      region,
      // Alarik (like MinIO) is addressed via path-style URLs: /bucket/object
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return storageClient;
}

/** Rewrites an internally-generated presigned URL to its public counterpart. */
function toPublicStorageUrl(url) {
  const internalBase = endpoint?.replace(/\/+$/, "");
  const publicBase = process.env.STORAGE_PUBLIC_URL?.replace(/\/+$/, "");
  if (!publicBase || !internalBase || !url.startsWith(internalBase)) return url;
  return publicBase + url.slice(internalBase.length);
}

/** Creates the bucket if it does not exist yet. */
export async function ensureBucket(bucket) {
  try {
    await getClient().send(new HeadBucketCommand({ Bucket: bucket }));
  } catch (err) {
    const status = err?.$metadata?.httpStatusCode;
    if (status === 404 || err.name === "NoSuchBucket" || err.name === "NotFound") {
      await getClient().send(new CreateBucketCommand({ Bucket: bucket }));
      return;
    }
    throw err;
  }
}

export async function putBuffer({ bucket, objectName, buffer, contentType }) {
  await getClient().send(
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
    getClient(),
    new GetObjectCommand({ Bucket: bucket, Key: objectName }),
    { expiresIn: expiresInSeconds }
  );
  return toPublicStorageUrl(url);
}

export async function deleteObject({ bucket, objectName }) {
  await getClient().send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: objectName,
    })
  );
}

/** Downloads an object fully into a Buffer. */
export async function getObjectBuffer({ bucket, objectName }) {
  const response = await getClient().send(
    new GetObjectCommand({ Bucket: bucket, Key: objectName })
  );
  const bytes = await response.Body.transformToByteArray();
  return Buffer.from(bytes);
}
