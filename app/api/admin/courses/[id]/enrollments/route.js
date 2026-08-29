import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Enrollment from '@/models/Enrollment';
import Course from '@/models/Course';
import { requireAdmin } from '@/lib/authGuard';

export async function GET(request, { params }) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { id: courseId } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    const statusFilter = searchParams.get('status');

    await dbConnect();

    const course = await Course.findById(courseId).lean();
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const query = { course: courseId };
    if (statusFilter && ["PENDING", "APPROVED", "REJECTED"].includes(statusFilter)) {
      query.status = statusFilter;
    }

    const enrollments = await Enrollment.find(query)
      .populate('user', 'firstName lastName personnelNumber')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();
      
    const totalEnrollments = await Enrollment.countDocuments(query);
    const pageCount = Math.ceil(totalEnrollments / limit);

    // Unfiltered status breakdown for the summary stat cards.
    const statusAgg = await Enrollment.aggregate([
      { $match: { course: course._id } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const counts = { PENDING: 0, APPROVED: 0, REJECTED: 0 };
    for (const row of statusAgg) {
      if (row._id in counts) counts[row._id] = row.count;
    }
    counts.total = counts.PENDING + counts.APPROVED + counts.REJECTED;

    return NextResponse.json({
      course,
      enrollments,
      counts,
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
