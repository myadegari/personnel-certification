import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Course from "@/models/Course";
import { requireStaffOrDeputyHead } from "@/lib/authGuard";
import { isStaffRole } from "@/lib/roles";
import { resolveDeputyHead } from "@/lib/deputyAccess";
import { uploadValidatedFile } from "@/lib/uploadService";

export async function POST(request) {
  const { session, error } = await requireStaffOrDeputyHead();
  if (error) return error;

  const data = await request.formData();
  const file = data.get("file");
  const fileType = data.get("fileType");
  const courseCode = data.get("courseCode");

  if (!file || !fileType) {
    return NextResponse.json(
      { error: "File or file type not provided" },
      { status: 400 }
    );
  }

  if (!["stamp1", "stamp2"].includes(fileType)) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }

  if (!courseCode) {
    return NextResponse.json(
      { error: "courseCode is required for stamp uploads" },
      { status: 400 }
    );
  }

  await dbConnect();

  const course = await Course.findOne({ courseCode });
  if (!course) {
    return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  // Deputy heads may only attach stamps to their own PRIVATE courses; staff
  // (ADMIN/SUPERADMIN) may attach to any course.
  if (!isStaffRole(session.user.role)) {
    const access = await resolveDeputyHead(session);
    if (access.error) return access.error;
    if (
      course.visibility !== "DEPUTY" ||
      String(course.deputy || "") !== String(access.deputy._id)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  try {
    const { fileRecord } = await uploadValidatedFile({
      file,
      bucket: "stamp",
      objectNameBase: `${course._id}/${fileType}`,
      userId: session.user.id,
      extra: { courseId: course._id },
    });

    if (fileType === "stamp1") {
      await Course.findByIdAndUpdate(course._id, { unitStamp: fileRecord._id });
    } else if (fileType === "stamp2") {
      await Course.findByIdAndUpdate(course._id, { unitStamp2: fileRecord._id });
    }

    return NextResponse.json({ file: fileRecord, url: fileRecord._id });
  } catch (err) {
    console.error("Stamp upload failed:", err);
    return NextResponse.json(
      { error: err.message || "Failed to upload file." },
      { status: err.status || 500 }
    );
  }
}
