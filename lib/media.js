import File from "@/models/File";
import Course from "@/models/Course";
import User from "@/models/User";
import { deleteObject } from "@/lib/storage";

export { BUCKET_LABELS_FA, PROTECTED_BUCKETS, classifyKind } from "@/lib/mediaConstants";

/** Find which courses/users reference a given File id. */
export async function findUsage(fileId) {
  const id = String(fileId);
  const [courses, users] = await Promise.all([
    Course.find({ $or: [{ unitStamp: id }, { unitStamp2: id }] })
      .select("name courseCode")
      .lean(),
    User.find({ signatureImage: id }).select("firstName lastName personnelNumber").lean(),
  ]);
  const usage = [];
  for (const c of courses) {
    usage.push({ type: "course", id: String(c._id), label: c.name, courseCode: c.courseCode });
  }
  for (const u of users) {
    usage.push({ type: "user", id: String(u._id), label: `${u.firstName} ${u.lastName}`.trim(), personnelNumber: u.personnelNumber });
  }
  return usage;
}

/** Which of the given file ids are referenced by a course or user. */
export async function referencedFileIds(fileIds) {
  const ids = fileIds.map(String);
  if (!ids.length) return new Set();
  const [courseRefs, userRefs] = await Promise.all([
    Course.find({ $or: [{ unitStamp: { $in: ids } }, { unitStamp2: { $in: ids } }] })
      .select("unitStamp unitStamp2")
      .lean(),
    User.find({ signatureImage: { $in: ids } }).select("signatureImage").lean(),
  ]);
  const referenced = new Set();
  for (const c of courseRefs) {
    if (c.unitStamp) referenced.add(String(c.unitStamp));
    if (c.unitStamp2) referenced.add(String(c.unitStamp2));
  }
  for (const u of userRefs) {
    if (u.signatureImage) referenced.add(String(u.signatureImage));
  }
  return referenced;
}

/** Remove the object from storage and its DB record. */
export async function deleteMediaRecord(fileDoc) {
  try {
    await deleteObject({ bucket: fileDoc.bucket, objectName: fileDoc.objectName });
  } catch (err) {
    console.error("Failed to delete object from storage:", err);
  }
  await File.findByIdAndDelete(fileDoc._id);
}
