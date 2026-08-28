import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import { requireAdmin } from '@/lib/authGuard';
import { uploadUserSignature } from '@/lib/signatureUpload';
import { ROLES, canAssignRole, canManageUser, isSuperAdmin, isValidRole } from '@/lib/roles';

const ALLOWED_FIELDS = ['firstName', 'lastName', 'email', 'role', 'personnelNumber', 'nationalId', 'gender', 'position', 'isProfessor'];

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
        position: value('position'),
        isProfessor: value('isProfessor') === 'true',
      },
      signatureFile: data.get('signatureFile') || undefined,
    };
  }

  const body = await request.json();
  return { fields: body, signatureFile: undefined };
}

// PUT: Update a user
export async function PUT(request, { params }) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    const { fields, signatureFile } = await parseUserPayload(request);

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

    let hasFieldUpdate = false;
    for (const field of ALLOWED_FIELDS) {
      if (field in fields) {
        user[field] = fields[field];
        hasFieldUpdate = true;
      }
    }

    if (!hasFieldUpdate && !signatureFile) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    if (hasFieldUpdate) {
      await user.save();
    }

    if (signatureFile) {
      await uploadUserSignature(user, signatureFile);
    }

    const safeUser = user.toObject();
    delete safeUser.password;
    return NextResponse.json(safeUser);
  } catch (err) {
    if (err?.code === 11000) {
      return NextResponse.json({ error: 'Duplicate personnel number, national ID or email' }, { status: 409 });
    }
    return NextResponse.json({ error: err.message || 'Failed to update user' }, { status: err.status || 500 });
  }
}
