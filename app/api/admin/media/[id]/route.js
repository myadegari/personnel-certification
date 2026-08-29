import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import File from "@/models/File";
import { requireAdmin } from "@/lib/authGuard";
import { findUsage, deleteMediaRecord, PROTECTED_BUCKETS } from "@/lib/media";

// PATCH: edit media metadata (title / alt)
export async function PATCH(request, { params }) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json();
    await dbConnect();

    const fileDoc = await File.findById(id);
    if (!fileDoc) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }

    if (typeof body.title === "string") fileDoc.title = body.title.trim();
    if (typeof body.alt === "string") fileDoc.alt = body.alt.trim();
    await fileDoc.save();

    return NextResponse.json({ file: fileDoc });
  } catch (err) {
    console.error("Media update error:", err);
    return NextResponse.json({ error: "Failed to update media." }, { status: 500 });
  }
}

// DELETE: guarded removal of a media asset
export async function DELETE(request, { params }) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    await dbConnect();

    const fileDoc = await File.findById(id);
    if (!fileDoc) {
      return NextResponse.json({ error: "Media not found" }, { status: 404 });
    }

    if (PROTECTED_BUCKETS.has(fileDoc.bucket)) {
      return NextResponse.json(
        { error: "گواهی‌های سیستمی قابل حذف نیستند." },
        { status: 403 }
      );
    }

    const usage = await findUsage(id);
    if (usage.length) {
      return NextResponse.json(
        { error: "این فایل در حال استفاده است و قابل حذف نیست.", usage },
        { status: 409 }
      );
    }

    await deleteMediaRecord(fileDoc);
    return NextResponse.json({ message: "Media deleted successfully" });
  } catch (err) {
    console.error("Media delete error:", err);
    return NextResponse.json({ error: "Failed to delete media." }, { status: 500 });
  }
}
