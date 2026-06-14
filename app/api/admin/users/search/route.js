import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';

// GET: Search users by name
export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session || !["ADMIN", "SUPERADMIN"].includes(session.user?.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    await dbConnect();

    // Search for users where firstName or lastName contains the query
    const users = await User.find({
      $or: [
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } },
      ],
    }).select('firstName lastName').limit(10); // Limit results for performance

    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
