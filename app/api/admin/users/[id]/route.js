import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';

// PUT: Update a user
export async function PUT(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.user?.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  try {
    const { id } = await params;
    const body = await request.json();
    const { firstName, lastName, email, role, personnelNumber,nationalId ,gender,position,isProfessor} = body;

    await dbConnect();

    // We don't update password here, that should be a separate "reset" flow
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { firstName, lastName, email, role, personnelNumber,nationalId,gender,position,isProfessor },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(updatedUser);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}