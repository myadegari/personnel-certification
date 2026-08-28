import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import { requireAdmin } from '@/lib/authGuard';

const ALLOWED_FIELDS = ['firstName', 'lastName', 'email', 'role', 'personnelNumber', 'nationalId', 'gender', 'position', 'isProfessor'];

// PUT: Update a user
export async function PUT(request, { params }) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json();

    if (body.role && !['USER', 'ADMIN'].includes(body.role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Whitelist fields; never touch password/status here (separate flows)
    const update = {};
    for (const field of ALLOWED_FIELDS) {
      if (field in body) update[field] = body[field];
    }
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    await dbConnect();

    const updatedUser = await User.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    }).select('-password');

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(updatedUser);
  } catch (err) {
    if (err?.code === 11000) {
      return NextResponse.json({ error: 'Duplicate personnel number, national ID or email' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
