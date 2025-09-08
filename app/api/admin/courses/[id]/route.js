import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Course from '@/models/Course';

// PUT: Update a course
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    await dbConnect();
    const updatedCourse = await Course.findByIdAndUpdate(id, body, { new: true });
    if (!updatedCourse) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }
    return NextResponse.json(updatedCourse);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update course' }, { status: 500 });
  }
}

// DELETE: Delete a course
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await dbConnect();
    await Course.findByIdAndDelete(id);
    // You might also want to delete related enrollments
    return NextResponse.json({ message: 'Course deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete course' }, { status: 500 });
  }
}
