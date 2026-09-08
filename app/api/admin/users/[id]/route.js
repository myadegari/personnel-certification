import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import Deputy from '@/models/Deputy';
import File from '@/models/File';
import { requireAdmin } from '@/lib/authGuard';
import { uploadUserSignature } from '@/lib/signatureUpload';
import { ROLES, canAssignRole, canManageUser, isSuperAdmin, isValidRole } from '@/lib/roles';
import { recordAuditEvent, AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from '@/lib/audit';
import { isValidNationalId, normalizeNationalIdValue } from '@/lib/national-id';

const ALLOWED_FIELDS = ['firstName', 'lastName', 'email', 'role', 'personnelNumber', 'nationalId', 'gender', 'deputy', 'headedDeputy'];

function normalizeObjectIdRef(value) {
  const id = String(value ?? '').trim();
  if (!id || id === 'none') return { value: null };
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { error: 'معاونت انتخابی نامعتبر است.' };
  }
  return { value: id };
}

async function assertDeputyReferencesExist(ids) {
  for (const id of new Set(ids.filter(Boolean))) {
    if (!(await Deputy.exists({ _id: id }))) {
      return NextResponse.json({ error: 'معاونت انتخابی یافت نشد.' }, { status: 400 });
    }
  }
  return null;
}

async function parseUserPayload(request) {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    const data = await request.formData();
    const value = (key) => {
      const entry = data.get(key);
      return entry === null ? undefined : entry;
    };

    return {
      fields: {
        firstName: value('firstName'),
        lastName: value('lastName'),
        personnelNumber: value('personnelNumber'),
        nationalId: value('nationalId'),
        email: value('email'),
        role: value('role'),
        gender: value('gender'),
        deputy: value('deputy'),
        headedDeputy: value('headedDeputy'),
      },
      signatureFile: data.get('signatureFile') || undefined,
      signatureFileId: data.get('signatureFileId') || undefined,
    };
  }

  const body = await request.json();
  return { fields: body, signatureFile: undefined, signatureFileId: undefined };
}

// PUT: Update a user
export async function PUT(request, { params }) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    const { fields, signatureFile, signatureFileId } = await parseUserPayload(request);

    if (fields.role && !isValidRole(fields.role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    await dbConnect();

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!canManageUser(session.user.role, user.role)) {
      return NextResponse.json({ error: 'You cannot edit this user' }, { status: 403 });
    }

    if ('nationalId' in fields) {
      const incomingNationalId = normalizeNationalIdValue(fields.nationalId);
      const originalNationalId = normalizeNationalIdValue(user.nationalId || '');
      if (
        incomingNationalId !== originalNationalId &&
        (incomingNationalId.length !== 10 || !isValidNationalId(incomingNationalId))
      ) {
        return NextResponse.json({ error: 'کد ملی معتبر نیست.' }, { status: 400 });
      }
      fields.nationalId = incomingNationalId;
    }

    const roleProvided = Boolean(fields.role);
    const deputyProvided = 'deputy' in fields;
    const headedDeputyProvided = 'headedDeputy' in fields;

    if (fields.role && fields.role !== user.role) {
      if (!canAssignRole(session.user.role, fields.role)) {
        return NextResponse.json({ error: 'You cannot assign this role' }, { status: 403 });
      }

      if (user.role === ROLES.SUPERADMIN && fields.role !== ROLES.SUPERADMIN) {
        if (id === session.user.id) {
          return NextResponse.json({ error: 'You cannot demote your own superadmin account' }, { status: 400 });
        }

        const superAdminCount = await User.countDocuments({ role: ROLES.SUPERADMIN });
        if (superAdminCount <= 1) {
          return NextResponse.json({ error: 'Cannot demote the last superadmin' }, { status: 400 });
        }
      }
    }

    if (roleProvided || deputyProvided || headedDeputyProvided) {
      let nextDeputy = user.deputy ? String(user.deputy) : null;
      let nextHeadedDeputy = user.headedDeputy ? String(user.headedDeputy) : null;

      if (deputyProvided) {
        const deputyRef = normalizeObjectIdRef(fields.deputy);
        if (deputyRef.error) {
          return NextResponse.json({ error: deputyRef.error }, { status: 400 });
        }
        nextDeputy = deputyRef.value;
      }

      if (headedDeputyProvided) {
        const headedDeputyRef = normalizeObjectIdRef(fields.headedDeputy);
        if (headedDeputyRef.error) {
          return NextResponse.json({ error: headedDeputyRef.error }, { status: 400 });
        }
        nextHeadedDeputy = headedDeputyRef.value;
      }

      const effectiveRole = fields.role || user.role;
      if (effectiveRole === ROLES.DEPUTY_HEAD) {
        if (!nextHeadedDeputy) {
          return NextResponse.json({ error: 'انتخاب معاونت تحت سرپرستی الزامی است.' }, { status: 400 });
        }
        nextDeputy = nextHeadedDeputy;
      } else {
        nextHeadedDeputy = null;
      }

      const deputyError = await assertDeputyReferencesExist([nextDeputy, nextHeadedDeputy]);
      if (deputyError) return deputyError;

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
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    if (hasFieldUpdate) {
      await user.save();
    }

    if (signatureFile) {
      await uploadUserSignature(user, signatureFile);
    } else if (signatureFileId) {
      const fileRecord = await File.findById(signatureFileId);
      if (!fileRecord) {
        return NextResponse.json({ error: 'Selected signature media not found' }, { status: 404 });
      }
      user.signatureImage = fileRecord._id;
      await user.save();
    }

    const safeUser = user.toObject();
    delete safeUser.password;
    await recordAuditEvent({
      request,
      session,
      action: AUDIT_ACTIONS.USER_UPDATE,
      resourceType: AUDIT_RESOURCE_TYPES.USER,
      resourceId: user._id,
      metadata: {
        fields: hasFieldUpdate ? ALLOWED_FIELDS.filter((f) => f in fields) : [],
        signatureUpdated: Boolean(signatureFile || signatureFileId),
      },
    });
    return NextResponse.json(safeUser);
  } catch (err) {
    if (err?.code === 11000) {
      return NextResponse.json({ error: 'Duplicate personnel number, national ID or email' }, { status: 409 });
    }
    return NextResponse.json({ error: err.message || 'Failed to update user' }, { status: err.status || 500 });
  }
}
