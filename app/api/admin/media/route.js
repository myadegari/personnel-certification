import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import dbConnect from "@/lib/dbConnect";
import File from "@/models/File";
import { requireAdmin } from "@/lib/authGuard";
import { readValidatedImage } from "@/lib/uploadValidation";
import { ensureBucket, putBuffer, getPresignedUrl } from "@/lib/storage";
import { classifyKind, referencedFileIds, PROTECTED_BUCKETS } from "@/lib/media";
import { recordAuditEvent, AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from "@/lib/audit";

const VALID_BUCKETS = ["media", "stamp", "signature", "certificate"];

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// GET: list media across buckets with filtering + pagination
export async function GET(request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "24")));
    const skip = (page - 1) * limit;

    await dbConnect();

    const filter = {};
    const bucket = searchParams.get("bucket");
    if (bucket && VALID_BUCKETS.includes(bucket)) filter.bucket = bucket;

    const type = searchParams.get("type");
    if (type === "image") filter.mimeType = /^image\//;
    else if (type === "other") filter.mimeType = { $not: /^image\// };

    const q = (searchParams.get("q") || "").trim().slice(0, 100);
    if (q) {
      const rx = new RegExp(escapeRegex(q), "i");
      filter.$or = [{ originalName: rx }, { title: rx }, { alt: rx }];
    }

    const [files, total] = await Promise.all([
      File.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      File.countDocuments(filter),
    ]);

    const referenced = await referencedFileIds(files.map((f) => f._id));

    const items = await Promise.all(
      files.map(async (f) => {
        let url = null;
        try {
          url = await getPresignedUrl({
            bucket: f.bucket,
            objectName: f.objectName,
            expiresInSeconds: 15 * 60,
          });
        } catch (err) {
          console.error("Failed to sign media URL:", err);
        }
        const protectedBucket = PROTECTED_BUCKETS.has(f.bucket);
        return {
          id: String(f._id),
          originalName: f.originalName,
          title: f.title || f.originalName,
          alt: f.alt || "",
          bucket: f.bucket,
          mimeType: f.mimeType,
          kind: classifyKind(f.mimeType),
          size: f.size,
          uploadedAt: f.createdAt,
          url,
          inUse: referenced.has(String(f._id)),
          deletable: !protectedBucket && !referenced.has(String(f._id)),
        };
      })
    );

    return NextResponse.json({
      items,
      pagination: {
        total,
        pageCount: Math.ceil(total / limit) || 1,
        currentPage: page,
      },
    });
  } catch (err) {
    console.error("Media list error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST: upload a new media asset into the library
export async function POST(request) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  try {
    const data = await request.formData();
    const file = data.get("file");
    const title = (data.get("title") || "").toString().trim();
    const alt = (data.get("alt") || "").toString().trim();

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    await dbConnect();

    const validated = await readValidatedImage(file);
    if (validated.error) {
      return NextResponse.json({ error: validated.error }, { status: validated.status });
    }

    const { buffer, mimeType, extension } = validated;
    const bucket = "media";
    const objectName = `${uuidv4()}${extension}`;

    await ensureBucket(bucket);
    await putBuffer({ bucket, objectName, buffer, contentType: mimeType });

    const expirySeconds = 7 * 24 * 60 * 60;
    const presignedUrl = await getPresignedUrl({ bucket, objectName, expiresInSeconds: expirySeconds });
    const expiresAt = new Date(Date.now() + expirySeconds * 1000);

    const created = await File.create({
      userId: session.user.id,
      bucket,
      objectName,
      originalName: file.name,
      title: title || file.name,
      alt,
      mimeType,
      size: buffer.length,
      presignedUrl,
      expiresAt,
    });

    await recordAuditEvent({
      request,
      session,
      action: AUDIT_ACTIONS.MEDIA_UPLOAD,
      resourceType: AUDIT_RESOURCE_TYPES.MEDIA,
      resourceId: created._id,
      metadata: { title: created.title, mimeType, size: buffer.length },
    });

    return NextResponse.json({ file: created, url: created._id }, { status: 201 });
  } catch (err) {
    console.error("Media upload error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to upload media." },
      { status: err.status || 500 }
    );
  }
}
