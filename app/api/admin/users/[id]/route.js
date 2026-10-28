import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import { requireAdmin } from '@/lib/authGuard';
import { recordAuditEvent, AUDIT_ACTIONS, AUDIT_RESOURCE_TYPES } from '@/lib/audit';
import { updateUser, parseUserPayload, UserServiceError } from '@/lib/userService';

// PUT: Update a user
export async function PUT(request, { params }) {
  const { session, error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    const { fields, signatureFile, signatureFileId } = await parseUserPayload(request);

    await dbConnect();

    const { safeUser, updatedFields } = await updateUser({
      session,
      id,
      fields,
      signatureFile,
      signatureFileId,
    });

    await recordAuditEvent({
      request,
      session,
      action: AUDIT_ACTIONS.USER_UPDATE,
      resourceType: AUDIT_RESOURCE_TYPES.USER,
      resourceId: safeUser._id,
      metadata: {
        fields: updatedFields,
        signatureUpdated: Boolean(signatureFile || signatureFileId),
      },
    });
    return NextResponse.json(safeUser);
  } catch (err) {
    if (err instanceof UserServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err?.code === 11000) {
      return NextResponse.json({ error: 'Duplicate personnel number, national ID or email' }, { status: 409 });
    }
    return NextResponse.json({ error: err.message || 'Failed to update user' }, { status: err.status || 500 });
  }
}
