import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Enrollment from '@/models/Enrollment';
import GuestCertificate from '@/models/GuestCertificate';
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

    // Pagination is applied after merging with guest rows, so both sources
    // are fetched in full (per-course volumes are bounded by the 9999-number
    // certificate capacity).
    const enrollments = await Enrollment.find(query)
      .populate('user', 'firstName lastName personnelNumber')
      .sort({ createdAt: -1 })
      .lean();
      
    // Certificates issued directly (admin actions / deputy issuance) for
    // persons without an account have no Enrollment; they are merged into the
    // same list so admins can see and download them here.
    const guests = await GuestCertificate.find({ course: courseId })
      .sort({ createdAt: -1 })
      .lean();

    const guestRows = guests.map((g) => ({
      _id: g._id,
      isGuest: true,
      status: null,
      user: {
        firstName: g.fullName,
        lastName: '',
        personnelNumber: null,
        nationalId: g.nationalId,
      },
      certificateUniqueId: g.certificateNumber,
      certificateUrl: g.certificateUrl || `/verify/${g._id}`,
      jobId: g.jobId,
      certificateStatus: g.certificateStatus,
      issuedAt: g.issuedAt,
      createdAt: g.createdAt,
    }));

    // Guest rows have no enrollment status, so the status filter only applies
    // to enrollments; guests surface under the unfiltered view only.
    const allRows = statusFilter
      ? [...enrollments]
      : [...enrollments, ...guestRows];
    allRows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const totalEnrollments = allRows.length;
    const pageCount = Math.ceil(totalEnrollments / limit) || 1;
    const pageRows = allRows.slice(skip, skip + limit);

    // Unfiltered status breakdown for the summary stat cards.
    const statusAgg = await Enrollment.aggregate([
      { $match: { course: course._id } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const counts = { PENDING: 0, APPROVED: 0, REJECTED: 0, GUEST: guests.length };
    for (const row of statusAgg) {
      if (row._id in counts) counts[row._id] = row.count;
    }
    counts.total = counts.PENDING + counts.APPROVED + counts.REJECTED;

    return NextResponse.json({
      course,
      enrollments: pageRows,
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
