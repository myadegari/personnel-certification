import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import Course from '@/models/Course';
import Enrollment from '@/models/Enrollment';
import { requireAdmin } from '@/lib/authGuard';
import { sanitizeUnits, joinUnits, MAX_COURSE_UNITS } from '@/lib/organizingUnits';
import { recordAuditEvent, AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from '@/lib/audit';

const ALLOWED_FIELDS = [
  "name",
  "date",
  "duration",
  "enrollmentDeadline",
  "enrollmentLimit",
  "organizingUnit",
  "organizingUnits",
  "organizingUnit2",
  "organizingUnits2",
  "deputy",
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
      .populate({
        path: 'signatory',
        select: 'firstName lastName deputy',
        populate: { path: 'deputy', select: 'name units' },
      })
      .populate({
        path: 'signatory2',
        select: 'firstName lastName deputy',
        populate: { path: 'deputy', select: 'name units' },
      })
      .populate('deputy', 'name number');

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
    if (update.deputy === '') update.deputy = null;

    // Structured units array wins over the free-text string: sanitize (max 2)
    // and recompute the joined display string. An empty array is dropped so
    // the free-text organizingUnit (no-deputy courses) still applies.
    if (Array.isArray(update.organizingUnits)) {
      const units = sanitizeUnits(update.organizingUnits, { max: MAX_COURSE_UNITS }) || [];
      update.organizingUnits = units;
      if (units.length) update.organizingUnit = joinUnits(units);
      else delete update.organizingUnits;
    }

    // Second signatory's units (template2): always recompute the joined string
    // so clearing the selection also clears organizingUnit2.
    if (Array.isArray(update.organizingUnits2)) {
      const units2 = sanitizeUnits(update.organizingUnits2, { max: MAX_COURSE_UNITS }) || [];
      update.organizingUnits2 = units2;
      update.organizingUnit2 = joinUnits(units2);
    }

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
