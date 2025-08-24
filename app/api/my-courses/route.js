import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";
import dbConnect from "@/lib/dbConnect";
import Enrollment from "@/models/Enrollment";

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '5'); // Let's show 5 per page
    const skip = (page - 1) * limit;

    await dbConnect();

    const enrollments = await Enrollment.find({ user: session.user.id, status: 'APPROVED' })
      .populate('course')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();
      
    const totalEnrollments = await Enrollment.countDocuments({ user: session.user.id, status: 'APPROVED' });
    const pageCount = Math.ceil(totalEnrollments / limit);

    return NextResponse.json({
      enrollments,
      pagination: {
        totalEnrollments,
        pageCount,
        currentPage: page,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}