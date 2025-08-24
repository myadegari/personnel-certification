import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Enrollment from '@/models/Enrollment';
import Course from '@/models/Course';

export async function GET(request, { params }) {
  try {
    const { id: courseId } = params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    await dbConnect();

    const course = await Course.findById(courseId).lean();
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const enrollments = await Enrollment.find({ course: courseId })
      .populate('user', 'firstName lastName personnelNumber')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();
      
    const totalEnrollments = await Enrollment.countDocuments({ course: courseId });
    const pageCount = Math.ceil(totalEnrollments / limit);

    return NextResponse.json({
      course,
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
