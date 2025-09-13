import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Course from '@/models/Course';
import Enrollment from '@/models/Enrollment';

// GET: Fetch a single course by ID
export async function GET(request, { params }) {
  try {
    await dbConnect();
    const course = await Course.findById(params.id)
      .populate('signatory', 'firstName lastName')
      .populate('signatory2', 'firstName lastName');
      
    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }
    return NextResponse.json(course);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch course' }, { status: 500 });
  }
}


// PUT: Update a course
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    await dbConnect();

    // Ensure empty strings for optional fields are converted to null
    // so they don't cause issues with ObjectId references.
    if (body.signatory === '') body.signatory = null;
    if (body.signatory2 === '') body.signatory2 = null;
    
    const updatedCourse = await Course.findByIdAndUpdate(id, body, { new: true, runValidators: true });

    if (!updatedCourse) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }
    return NextResponse.json(updatedCourse);
  } catch (error) {
     console.error("Course Update Error:", error);
    return NextResponse.json({ error: 'Failed to update course' }, { status: 500 });
  }
}

// DELETE: Delete a course
export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    await dbConnect();
    
    // First, update related enrollments to reflect the course deletion
    await Enrollment.updateMany(
      { course: id },
      { $set: { "metadata.courseStatus": "PERISH" } }
    );
    
    // Then, delete the course itself
    const deletedCourse = await Course.findByIdAndDelete(id);
    if (!deletedCourse) {
        return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    return NextResponse.json({ message: "Course deleted and enrollments updated successfully."});
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete course' }, { status: 500 });
  }
}
