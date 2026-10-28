import mongoose from "mongoose";
import User from "@/models/User";
import Deputy from "@/models/Deputy";
import File from "@/models/File";
import bcrypt from "bcrypt";
import { uploadUserSignature } from "@/lib/signatureUpload";
import { ROLES, canAssignRole, canManageUser, isSuperAdmin, isValidRole } from "@/lib/roles";
import { isValidNationalId, normalizeNationalIdValue } from "@/lib/national-id";

/** Typed service error: routes map `status` straight to the HTTP response. */
export class UserServiceError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const ALLOWED_FIELDS = [
  "firstName",
  "lastName",
  "email",
  "role",
  "personnelNumber",
  "nationalId",
  "gender",
  "deputy",
  "headedDeputy",
];

export function normalizeObjectIdRef(value) {
  const id = String(value ?? "").trim();
  if (!id || id === "none") return { value: null };
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { error: "معاونت انتخابی نامعتبر است." };
  }
  return { value: id };
}

async function assertDeputyReferencesExist(ids) {
  for (const id of new Set(ids.filter(Boolean))) {
    if (!(await Deputy.exists({ _id: id }))) {
      throw new UserServiceError("معاونت انتخابی یافت نشد.", 400);
    }
  }
}

/** Shared User payload parser for the create/update routes. */
export async function parseUserPayload(request) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const data = await request.formData();
    const value = (key) => {
      const entry = data.get(key);
      return entry === null ? undefined : entry;
    };

    return {
      fields: {
        personnelNumber: value("personnelNumber"),
        password: value("password"),
        firstName: value("firstName"),
        lastName: value("lastName"),
        nationalId: value("nationalId"),
        email: value("email"),
        role: value("role"),
        gender: value("gender"),
        deputy: value("deputy"),
        headedDeputy: value("headedDeputy"),
      },
      signatureFile: data.get("signatureFile") || undefined,
      signatureFileId: data.get("signatureFileId") || undefined,
    };
  }

  const body = await request.json();
  return { fields: body, signatureFile: undefined, signatureFileId: undefined };
}

/**
 * Resolve deputy + headedDeputy fields into the pair actually stored on the
 * user (DEPUTY_HEAD forces deputy = headedDeputy; others clear headedDeputy).
 */
async function resolveDeputyFields({ role, deputy, headedDeputy }) {
  const deputyRef = normalizeObjectIdRef(deputy);
  if (deputyRef.error) throw new UserServiceError(deputyRef.error, 400);
  const headedDeputyRef = normalizeObjectIdRef(headedDeputy);
  if (headedDeputyRef.error) throw new UserServiceError(headedDeputyRef.error, 400);

  let resolvedDeputy = deputyRef.value;
  let resolvedHeadedDeputy = headedDeputyRef.value;

  if (role === ROLES.DEPUTY_HEAD) {
    if (!resolvedHeadedDeputy) {
      throw new UserServiceError("انتخاب معاونت تحت سرپرستی الزامی است.", 400);
    }
    resolvedDeputy = resolvedHeadedDeputy;
  } else {
    resolvedHeadedDeputy = null;
  }

  await assertDeputyReferencesExist([resolvedDeputy, resolvedHeadedDeputy]);
  return { deputy: resolvedDeputy, headedDeputy: resolvedHeadedDeputy };
}

/**
 * Attach a signature to a user, either by uploading a fresh file or by
 * referencing an existing media-library File. On create (`compensateUserId`
 * provided) a failure deletes the just-created user so a broken signature
 * never leaves an orphaned account.
 */
async function attachSignature(user, { signatureFile, signatureFileId }, compensateUserId) {
  const compensate = async () => {
    if (compensateUserId) {
      await User.findByIdAndDelete(compensateUserId);
    }
  };

  if (signatureFile) {
    try {
      await uploadUserSignature(user, signatureFile);
    } catch (uploadError) {
      await compensate();
      throw new UserServiceError(
        uploadError.message || "Failed to upload signature.",
        uploadError.status || 500
      );
    }
  } else if (signatureFileId) {
    const fileRecord = await File.findById(signatureFileId);
    if (!fileRecord) {
      await compensate();
      throw new UserServiceError("Selected signature media not found", 404);
    }
    user.signatureImage = fileRecord._id;
    await user.save();
  }
}

/**
 * Create a user. Owns validation, role-assignment rules, deputy references,
 * hashing, and signature attachment (with compensating rollback on failure).
 *
 * @param {object} p
 * @param {object} p.session  Caller's session (role checks).
 * @param {object} p.fields   Parsed user fields (see parseUserPayload).
 * @param {object} [p.signatureFile]    Optional fresh signature upload.
 * @param {string} [p.signatureFileId]   Optional existing media File id.
 * @returns {Promise<object>} The created user document (password omitted via toObject).
 * @throws {UserServiceError} With `.status` for every validation failure.
 */
export async function createUser({ session, fields, signatureFile, signatureFileId }) {
  const { personnelNumber, password, firstName, lastName, email, role, gender } = fields;
  const nationalId = normalizeNationalIdValue(fields.nationalId);

  if (!personnelNumber || !password || !firstName || !lastName || !nationalId || !email || !gender) {
    throw new UserServiceError("Missing required fields", 400);
  }
  if (nationalId.length !== 10 || !isValidNationalId(nationalId)) {
    throw new UserServiceError("کد ملی معتبر نیست.", 400);
  }
  if (typeof password !== "string" || password.length < 8) {
    throw new UserServiceError("رمز عبور باید حداقل ۸ کاراکتر باشد.", 400);
  }
  if (!isValidRole(role)) {
    throw new UserServiceError("Invalid role", 400);
  }
  if (!canAssignRole(session.user.role, role)) {
    throw new UserServiceError("You cannot assign this role", 403);
  }

  const { deputy, headedDeputy } = await resolveDeputyFields({
    role,
    deputy: fields.deputy,
    headedDeputy: fields.headedDeputy,
  });

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = await User.create({
    personnelNumber,
    password: hashedPassword,
    firstName,
    lastName,
    nationalId,
    email,
    gender,
    role,
    deputy,
    headedDeputy,
    status: "VERIFIED",
  });

  await attachSignature(newUser, { signatureFile, signatureFileId }, newUser._id);

  const safeUser = newUser.toObject();
  delete safeUser.password;
  return safeUser;
}

/**
 * Update a user. Owns permission checks, national-id revalidation, deputy
 * resolution, last-superadmin protection, and signature attachment.
 * Duplicate/national-id errors carry `.status` 409 from Mongoose code 11000.
 *
 * @returns {Promise<{safeUser: object, updatedFields: string[]}>}
 */
export async function updateUser({ session, id, fields, signatureFile, signatureFileId }) {
  if (fields.role && !isValidRole(fields.role)) {
    throw new UserServiceError("Invalid role", 400);
  }

  const user = await User.findById(id);
  if (!user) {
    throw new UserServiceError("User not found", 404);
  }

  if (!canManageUser(session.user.role, user.role)) {
    throw new UserServiceError("You cannot edit this user", 403);
  }

  if ("nationalId" in fields) {
    const incomingNationalId = normalizeNationalIdValue(fields.nationalId);
    const originalNationalId = normalizeNationalIdValue(user.nationalId || "");
    if (
      incomingNationalId !== originalNationalId &&
      (incomingNationalId.length !== 10 || !isValidNationalId(incomingNationalId))
    ) {
      throw new UserServiceError("کد ملی معتبر نیست.", 400);
    }
    fields.nationalId = incomingNationalId;
  }

  const deputyProvided = "deputy" in fields;
  const headedDeputyProvided = "headedDeputy" in fields;

  if (fields.role && fields.role !== user.role) {
    if (!canAssignRole(session.user.role, fields.role)) {
      throw new UserServiceError("You cannot assign this role", 403);
    }

    if (user.role === ROLES.SUPERADMIN && fields.role !== ROLES.SUPERADMIN) {
      if (id === session.user.id) {
        throw new UserServiceError("You cannot demote your own superadmin account", 400);
      }

      const superAdminCount = await User.countDocuments({ role: ROLES.SUPERADMIN });
      if (superAdminCount <= 1) {
        throw new UserServiceError("Cannot demote the last superadmin", 400);
      }
    }
  }

  if (fields.role || deputyProvided || headedDeputyProvided) {
    let nextDeputy = user.deputy ? String(user.deputy) : null;
    let nextHeadedDeputy = user.headedDeputy ? String(user.headedDeputy) : null;

    if (deputyProvided) {
      const deputyRef = normalizeObjectIdRef(fields.deputy);
      if (deputyRef.error) throw new UserServiceError(deputyRef.error, 400);
      nextDeputy = deputyRef.value;
    }

    if (headedDeputyProvided) {
      const headedDeputyRef = normalizeObjectIdRef(fields.headedDeputy);
      if (headedDeputyRef.error) throw new UserServiceError(headedDeputyRef.error, 400);
      nextHeadedDeputy = headedDeputyRef.value;
    }

    const effectiveRole = fields.role || user.role;
    if (effectiveRole === ROLES.DEPUTY_HEAD) {
      if (!nextHeadedDeputy) {
        throw new UserServiceError("انتخاب معاونت تحت سرپرستی الزامی است.", 400);
      }
      nextDeputy = nextHeadedDeputy;
    } else {
      nextHeadedDeputy = null;
    }

    await assertDeputyReferencesExist([nextDeputy, nextHeadedDeputy]);

    fields.deputy = nextDeputy;
    fields.headedDeputy = nextHeadedDeputy;
  }

  let hasFieldUpdate = false;
  for (const field of ALLOWED_FIELDS) {
    if (field in fields) {
      user[field] = fields[field];
      hasFieldUpdate = true;
    }
  }

  if (!hasFieldUpdate && !signatureFile && !signatureFileId) {
    throw new UserServiceError("No valid fields to update", 400);
  }

  if (hasFieldUpdate) {
    await user.save();
  }

  await attachSignature(user, { signatureFile, signatureFileId }, null);

  const safeUser = user.toObject();
  delete safeUser.password;
  return {
    safeUser,
    updatedFields: hasFieldUpdate ? ALLOWED_FIELDS.filter((f) => f in fields) : [],
  };
}

/**
 * Bulk delete users. Owns self-deletion protection, per-target manage
 * checks, and the last-superadmin invariant.
 */
export async function deleteUsers({ session, userIds }) {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    throw new UserServiceError("User IDs are required", 400);
  }

  if (userIds.includes(session.user.id)) {
    throw new UserServiceError("You cannot delete your own account", 400);
  }

  const targets = await User.find({ _id: { $in: userIds } }).select("role");
  for (const target of targets) {
    if (!canManageUser(session.user.role, target.role)) {
      throw new UserServiceError("You cannot delete this user", 403);
    }
  }

  if (isSuperAdmin(session.user.role)) {
    const superAdminCount = await User.countDocuments({ role: ROLES.SUPERADMIN });
    const deletingSuperAdmins = targets.filter((t) => t.role === ROLES.SUPERADMIN).length;
    if (superAdminCount - deletingSuperAdmins < 1) {
      throw new UserServiceError("Cannot delete the last superadmin", 400);
    }
  }

  await User.deleteMany({ _id: { $in: userIds } });
  return { count: userIds.length, ids: userIds.slice(0, 100) };
}
