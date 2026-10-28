import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import { requireAdmin } from '@/lib/authGuard';
import { ROLES, isSuperAdmin, isValidRole } from '@/lib/roles';
import { recordAuditEvent, AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from '@/lib/audit';
import { escapeRegex } from '@/lib/utils';
import { createUser, deleteUsers, parseUserPayload, UserServiceError } from '@/lib/userService';

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

    await dbConnect();

    const safeUser = await createUser({
      session,
      fields,
      signatureFile,
      signatureFileId,
    });

    await recordAuditEvent({
      request,
      session,
      action: AUDIT_ACTIONS.USER_CREATE,
      resourceType: AUDIT_RESOURCE_TYPES.USER,
      resourceId: safeUser._id,
      metadata: {
        name: `${safeUser.firstName} ${safeUser.lastName}`.trim(),
        role: safeUser.role,
        personnelNumber: safeUser.personnelNumber,
      },
    });
    return NextResponse.json(safeUser, { status: 201 });
  } catch (error) {
    if (error instanceof UserServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
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

    await dbConnect();

    const { count, ids } = await deleteUsers({ session, userIds });

    await recordAuditEvent({
      request,
      session,
      action: AUDIT_ACTIONS.USER_DELETE,
      resourceType: AUDIT_RESOURCE_TYPES.USER,
      metadata: { count, ids },
    });

    return NextResponse.json({ message: 'Users deleted successfully' });
  } catch (error) {
    if (error instanceof UserServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Failed to delete users' }, { status: 500 });
  }
}
