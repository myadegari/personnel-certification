import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Course from '@/models/Course';
import Enrollment from '@/models/Enrollment';
import { requireAdmin } from '@/lib/authGuard';
import { recordAuditEvent, AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from '@/lib/audit';

const ALLOWED_FIELDS = [
  "name",
  "date",
  "duration",
  "enrollmentDeadline",
  "enrollmentLimit",
  "organizingUnit",
  "signatory",
  "unitStamp",
  "signatory2",
  "unitStamp2",
];

// GET: Fetch a single course by ID
export async function GET(request, { params }) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    await dbConnect();
    const course = await Course.findById(id)
      .populate('signatory', 'firstName lastName')
      .populate('signatory2', 'firstName lastName');

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }
    return NextResponse.json(course);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch course' }, { status: 500 });
  }
}

// PUT: Update a course
export async function PUT(request, { params }) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    const body = await request.json();

    // Whitelist fields to prevent mass assignment
    const update = {};
    for (const field of ALLOWED_FIELDS) {
      if (field in body) update[field] = body[field];
    }

    // Ensure empty strings for optional ObjectId references are converted to null
    if (update.signatory === '') update.signatory = null;
    if (update.signatory2 === '') update.signatory2 = null;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    await dbConnect();
    const updatedCourse = await Course.findByIdAndUpdate(id, update, { new: true, runValidators: true });

    if (!updatedCourse) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }
    await recordAuditEvent({
      request,
      session,
      action: AUDIT_ACTIONS.COURSE_UPDATE,
      resourceType: AUDIT_RESOURCE_TYPES.COURSE,
      resourceId: updatedCourse._id,
      metadata: { fields: Object.keys(update), courseName: updatedCourse.name },
    });
    return NextResponse.json(updatedCourse);
  } catch (err) {
    console.error('Course Update Error:', err);
    return NextResponse.json({ error: 'Failed to update course' }, { status: 500 });
  }
}

// DELETE: Delete a course
export async function DELETE(request, { params }) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    await dbConnect();

    const deletedCourse = await Course.findByIdAndDelete(id);
    if (!deletedCourse) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Mark related enrollments so their history reflects the course deletion.
    // Uses the dotted path so other metadata keys survive.
    await Enrollment.updateMany(
      { course: id },
      { $set: { "metadata.courseStatus": "PERISH" } }
    );

    await recordAuditEvent({
      request,
      session,
      action: AUDIT_ACTIONS.COURSE_DELETE,
      resourceType: AUDIT_RESOURCE_TYPES.COURSE,
      resourceId: deletedCourse._id,
      metadata: { courseName: deletedCourse.name },
    });

    return NextResponse.json({ message: 'Course deleted and enrollments updated successfully.' });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete course' }, { status: 500 });
  }
}
