import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import File from "@/models/File";
import { requireAdmin } from "@/lib/authGuard";
import { uploadUserSignature } from "@/lib/signatureUpload";
import { canManageUser } from "@/lib/roles";
import { recordAuditEvent, AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from "@/lib/audit";

export async function POST(request, { params }) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    const data = await request.formData();
    const file = data.get("file");
    const fileId = data.get("fileId");

    if (!file && !fileId) {
      return NextResponse.json({ error: "File or fileId is required" }, { status: 400 });
    }

    await dbConnect();

    const targetUser = await User.findById(id).select("personnelNumber role signatureImage");
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!canManageUser(session.user.role, targetUser.role)) {
      return NextResponse.json({ error: "You cannot edit this user" }, { status: 403 });
    }

    // Assign an existing library media as the signature.
    if (fileId && !file) {
      const fileRecord = await File.findById(fileId);
      if (!fileRecord) {
        return NextResponse.json({ error: "Selected media not found" }, { status: 404 });
      }
      targetUser.signatureImage = fileRecord._id;
      await targetUser.save();
      await recordAuditEvent({
        request,
        session,
        action: AUDIT_ACTIONS.SIGNATURE_UPDATE,
        resourceType: AUDIT_RESOURCE_TYPES.USER,
        resourceId: targetUser._id,
        metadata: { source: "library", personnelNumber: targetUser.personnelNumber },
      });
      return NextResponse.json({ file: fileRecord, url: fileRecord._id });
    }

    const fileRecord = await uploadUserSignature(targetUser, file);

    await recordAuditEvent({
      request,
      session,
      action: AUDIT_ACTIONS.SIGNATURE_UPDATE,
      resourceType: AUDIT_RESOURCE_TYPES.USER,
      resourceId: targetUser._id,
      metadata: { source: "upload", personnelNumber: targetUser.personnelNumber },
    });

    return NextResponse.json({ file: fileRecord, url: fileRecord._id });
  } catch (err) {
    console.error("Admin signature upload error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to upload signature." },
      { status: err.status || 500 }
    );
  }
}
