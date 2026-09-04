import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import File from '@/models/File';
import bcrypt from 'bcrypt';
import { requireAdmin } from '@/lib/authGuard';
import { uploadUserSignature } from '@/lib/signatureUpload';
import { ROLES, canAssignRole, canManageUser, isSuperAdmin, isValidRole } from '@/lib/roles';
import { recordAuditEvent, AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from '@/lib/audit';

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
        personnelNumber: value('personnelNumber'),
        password: value('password'),
        firstName: value('firstName'),
        lastName: value('lastName'),
        nationalId: value('nationalId'),
        email: value('email'),
        role: value('role'),
        gender: value('gender'),
      },
      signatureFile: data.get('signatureFile') || undefined,
      signatureFileId: data.get('signatureFileId') || undefined,
    };
  }

  const body = await request.json();
  return { fields: body, signatureFile: undefined, signatureFileId: undefined };
}

// Escape user input so it is treated literally inside $regex
function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const SORTABLE_FIELDS = [
  'personnelNumber',
  'firstName',
  'lastName',
  'email',
  'role',
  'status',
  'createdAt',
];

const VALID_STATUSES = ['PENDING', 'NEED_TO_VERIFY', 'VERIFIED', 'REJECTED'];

function buildUserFilter(session, searchParams) {
  const filter = isSuperAdmin(session.user.role) ? {} : { role: ROLES.USER };

  const q = (searchParams.get('q') || '').trim().slice(0, 100);
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [
      { firstName: rx },
      { lastName: rx },
      { personnelNumber: rx },
      { email: rx },
      { nationalId: rx },
    ];
  }

  const status = searchParams.get('status');
  if (status && VALID_STATUSES.includes(status)) {
    filter.status = status;
  }

  const role = searchParams.get('role');
  if (role && isValidRole(role)) {
    // Normal admins are already scoped to USER; only superadmins may filter by role.
    if (isSuperAdmin(session.user.role)) {
      filter.role = role;
    }
  }

  // Offline password-reset workflow: narrow to accounts awaiting a reset
  // (user requested) or currently holding a temporary password.
  const passwordState = searchParams.get('passwordState');
  if (passwordState === 'requested') {
    filter.passwordResetRequested = true;
  } else if (passwordState === 'temp') {
    filter.mustChangePassword = true;
  }

  return filter;
}

function buildSort(searchParams) {
  const sort = searchParams.get('sort');
  const order = searchParams.get('order') === 'asc' ? 1 : -1;
  if (sort && SORTABLE_FIELDS.includes(sort)) {
    return { [sort]: order };
  }
  return { createdAt: -1 };
}

// GET: Fetch users with pagination, search, filtering and sorting
export async function GET(request) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')));
    const skip = (page - 1) * limit;

    await dbConnect();

    const filter = buildUserFilter(session, searchParams);
    const sort = buildSort(searchParams);

    const users = await User.find(filter).select('-password').skip(skip).limit(limit).sort(sort);
    const totalUsers = await User.countDocuments(filter);
    const pageCount = Math.ceil(totalUsers / limit);

    return NextResponse.json({
      users,
      pagination: {
        totalUsers,
        pageCount,
        currentPage: page,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST: Create a new user
export async function POST(request) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  try {
    const { fields, signatureFile, signatureFileId } = await parseUserPayload(request);
    const { personnelNumber, password, firstName, lastName, nationalId, email, role, gender } = fields;

    if (!personnelNumber || !password || !firstName || !lastName || !nationalId || !email || !gender) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'رمز عبور باید حداقل ۸ کاراکتر باشد.' }, { status: 400 });
    }
    if (!isValidRole(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }
    if (!canAssignRole(session.user.role, role)) {
      return NextResponse.json({ error: 'You cannot assign this role' }, { status: 403 });
    }

    await dbConnect();

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
      status: 'VERIFIED',
    });

    if (signatureFile) {
      try {
        await uploadUserSignature(newUser, signatureFile);
      } catch (uploadError) {
        await User.findByIdAndDelete(newUser._id);
        return NextResponse.json(
          { error: uploadError.message || 'Failed to upload signature.' },
          { status: uploadError.status || 500 }
        );
      }
    } else if (signatureFileId) {
      const fileRecord = await File.findById(signatureFileId);
      if (!fileRecord) {
        await User.findByIdAndDelete(newUser._id);
        return NextResponse.json({ error: 'Selected signature media not found' }, { status: 404 });
      }
      newUser.signatureImage = fileRecord._id;
      await newUser.save();
    }

    const safeUser = newUser.toObject();
    delete safeUser.password;
    await recordAuditEvent({
      request,
      session,
      action: AUDIT_ACTIONS.USER_CREATE,
      resourceType: AUDIT_RESOURCE_TYPES.USER,
      resourceId: newUser._id,
      metadata: {
        name: `${newUser.firstName} ${newUser.lastName}`.trim(),
        role: newUser.role,
        personnelNumber: newUser.personnelNumber,
      },
    });
    return NextResponse.json(safeUser, { status: 201 });
  } catch (error) {
    if (error?.code === 11000) {
      return NextResponse.json({ error: 'User already exists (duplicate personnel number, national ID or email)' }, { status: 409 });
    }
    if (error?.name === 'ValidationError') {
      return NextResponse.json({ error: 'Invalid user data', details: Object.values(error.errors).map((e) => e.message) }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

// DELETE: Handle bulk deletion of users
export async function DELETE(request) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  try {
    const { userIds } = await request.json();
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'User IDs are required' }, { status: 400 });
    }

    await dbConnect();

    if (userIds.includes(session.user.id)) {
      return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 });
    }

    const targets = await User.find({ _id: { $in: userIds } }).select('role');
    for (const target of targets) {
      if (!canManageUser(session.user.role, target.role)) {
        return NextResponse.json({ error: 'You cannot delete this user' }, { status: 403 });
      }
    }

    if (isSuperAdmin(session.user.role)) {
      const superAdminCount = await User.countDocuments({ role: ROLES.SUPERADMIN });
      const deletingSuperAdmins = targets.filter((target) => target.role === ROLES.SUPERADMIN).length;
      if (superAdminCount - deletingSuperAdmins < 1) {
        return NextResponse.json({ error: 'Cannot delete the last superadmin' }, { status: 400 });
      }
    }

    await User.deleteMany({ _id: { $in: userIds } });

    await recordAuditEvent({
      request,
      session,
      action: AUDIT_ACTIONS.USER_DELETE,
      resourceType: AUDIT_RESOURCE_TYPES.USER,
      metadata: { count: userIds.length, ids: userIds.slice(0, 100) },
    });

    return NextResponse.json({ message: 'Users deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete users' }, { status: 500 });
  }
}
