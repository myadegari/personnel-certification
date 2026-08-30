import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import dbConnect from "@/lib/dbConnect";
import Enrollment, { LIVE_ENROLLMENT_FILTER } from "@/models/Enrollment";
import Course from "@/models/Course";
import { fromShamsi } from "@/lib/persian-date";

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

    // Optional Jalali-year filter: only certificates whose COURSE was held in
    // that year (same semantics as the annual-hours stat).
    const yearParam = searchParams.get('year');
    let year = null;
    if (yearParam) {
      year = Number(yearParam);
      if (!Number.isInteger(year) || year < 1300 || year > 1500) {
        return NextResponse.json({ error: 'سال نامعتبر است.' }, { status: 400 });
      }
    }

    await dbConnect();

    const baseFilter = {
      user: session.user.id,
      status: 'APPROVED',
      ...LIVE_ENROLLMENT_FILTER,
    };

    if (year != null) {
      const startSec = fromShamsi({ year, month: 1, day: 1 }).getTime() / 1000;
      const endSec = fromShamsi({ year: year + 1, month: 1, day: 1 }).getTime() / 1000;
      const coursesInYear = await Course.find({
        date: { $gte: startSec, $lt: endSec },
      })
        .select('_id')
        .lean();
      baseFilter.course = { $in: coursesInYear.map((c) => c._id) };
    }

    const enrollments = await Enrollment.find(baseFilter)
      .populate('course')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    const totalEnrollments = await Enrollment.countDocuments(baseFilter);
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
