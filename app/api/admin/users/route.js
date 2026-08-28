import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import bcrypt from 'bcrypt';
import { requireAdmin } from '@/lib/authGuard';

// GET: Fetch users with pagination
export async function GET(request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')));
    const skip = (page - 1) * limit;

    await dbConnect();

    const users = await User.find().select('-password').skip(skip).limit(limit).sort({ createdAt: -1 });
    const totalUsers = await User.countDocuments();
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
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const body = await request.json();
    const { personnelNumber, password, firstName, lastName, nationalId, email, role, gender, position, isProfessor } = body;

    if (!personnelNumber || !password || !firstName || !lastName || !nationalId || !email || !gender) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (!['USER', 'ADMIN'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
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
      position,
      isProfessor,
      role,
    });

    const safeUser = newUser.toObject();
    delete safeUser.password;
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

    // Prevent an admin from deleting their own account
    if (userIds.includes(session.user.id)) {
      return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 });
    }

    await User.deleteMany({ _id: { $in: userIds } });

    return NextResponse.json({ message: 'Users deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete users' }, { status: 500 });
  }
}
