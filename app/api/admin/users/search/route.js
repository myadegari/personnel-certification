import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import { requireStaffOrDeputyHead } from '@/lib/authGuard';

// Escape user input so it is treated literally inside $regex
function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// GET: Search users by name (staff + deputy heads, for signatory pickers)
export async function GET(request) {
  const { error } = await requireStaffOrDeputyHead();
  if (error) return error;

  try {
    const { searchParams } = new URL(request.url);
    const query = escapeRegex((searchParams.get('q') || '').trim()).slice(0, 100);

    if (!query) {
      return NextResponse.json([]);
    }

    await dbConnect();

    const users = await User.find({
      $or: [
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } },
      ],
    })
      .select('firstName lastName')
      .limit(10);

    return NextResponse.json(users);
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
