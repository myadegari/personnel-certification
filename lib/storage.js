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
let publicClient;

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

/**
 * Client used to sign browser-facing presigned URLs.
 *
 * SigV4 signs the `host` header, so the URL must be signed against the exact
 * host the browser will hit (STORAGE_PUBLIC_URL). Signing against the internal
 * endpoint and rewriting the host afterwards invalidates the signature
 * (SignatureDoesNotMatch). Falls back to the internal endpoint when no public
 * URL is configured.
 */
function getPublicClient() {
  if (!publicClient) {
    const publicEndpoint = process.env.STORAGE_PUBLIC_URL || endpoint;
    if (!publicEndpoint || !accessKeyId || !secretAccessKey) {
      throw new Error(
        "Missing storage configuration: STORAGE_ENDPOINT/STORAGE_PUBLIC_URL, STORAGE_ACCESS_KEY and STORAGE_SECRET_KEY must be set."
      );
    }
    publicClient = new S3Client({
      endpoint: publicEndpoint,
      region,
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return publicClient;
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

/** Generates a browser-facing presigned URL, signed against the public host. */
export async function getPresignedUrl({ bucket, objectName, expiresInSeconds }) {
  const url = await getSignedUrl(
    getPublicClient(),
    new GetObjectCommand({ Bucket: bucket, Key: objectName }),
    { expiresIn: expiresInSeconds }
  );
  return url;
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
