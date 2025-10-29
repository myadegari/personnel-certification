import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import bcrypt from 'bcrypt';

// GET: Fetch users with pagination
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
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
  try {
    const body = await request.json();
    const { personnelNumber, password, firstName, lastName, nationalId, email, role,gender,position,isProfessor } = body;

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
      role
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

// DELETE: Handle bulk deletion of users
export async function DELETE(request) {
  try {
    const { userIds } = await request.json();
    if (!userIds || userIds.length === 0) {
      return NextResponse.json({ error: 'User IDs are required' }, { status: 400 });
    }

    await dbConnect();
    await User.deleteMany({ _id: { $in: userIds } });

    return NextResponse.json({ message: 'Users deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete users' }, { status: 500 });
  }
}