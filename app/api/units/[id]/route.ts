import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Unit from '@/models/Unit';
import { createAuditLog, getChangedFields, sanitizeForAudit } from '@/lib/audit';
import { updateUnitSchema } from '@/lib/validators';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { id } = await params;
  const unit = await Unit.findById(id).lean();
  if (!unit) return NextResponse.json({ error: 'Unit not found' }, { status: 404 });

  return NextResponse.json({ unit });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { id } = await params;
  const body = await req.json();
  const parsed = updateUnitSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await Unit.findById(id);
  if (!existing) return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
  if (existing.status === 'archived') {
    return NextResponse.json({ error: 'Cannot edit archived unit. Restore it first.' }, { status: 400 });
  }

  const username = (session.user as any).username;
  const prevData = sanitizeForAudit(existing.toObject());

  Object.assign(existing, parsed.data, { updatedBy: username });
  await existing.save();

  const newData = sanitizeForAudit(existing.toObject());
  const changedFields = getChangedFields(prevData, newData);

  await createAuditLog({
    entityType: 'unit',
    entityId: id,
    action: 'update',
    performedBy: username,
    previousData: prevData,
    newData: newData,
    changedFields,
    note: `Updated unit: ${existing.unitName}`,
  });

  return NextResponse.json({ unit: existing });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { id } = await params;
  const body = await req.json();
  const username = (session.user as any).username;

  const unit = await Unit.findById(id);
  if (!unit) return NextResponse.json({ error: 'Unit not found' }, { status: 404 });

  const action = body.action;

  if (action === 'archive') {
    if (unit.status === 'archived') {
      return NextResponse.json({ error: 'Already archived' }, { status: 400 });
    }
    const prevStatus = unit.status;
    unit.status = 'archived';
    unit.archivedAt = new Date();
    unit.archivedBy = username;
    unit.updatedBy = username;
    await unit.save();

    await createAuditLog({
      entityType: 'unit',
      entityId: id,
      action: 'archive',
      performedBy: username,
      previousData: { status: prevStatus },
      newData: { status: 'archived' },
      note: `Archived unit: ${unit.unitName}`,
    });
  } else if (action === 'restore') {
    if (unit.status !== 'archived') {
      return NextResponse.json({ error: 'Unit is not archived' }, { status: 400 });
    }
    unit.status = 'vacant';
    unit.archivedAt = undefined;
    unit.archivedBy = undefined;
    unit.updatedBy = username;
    await unit.save();

    await createAuditLog({
      entityType: 'unit',
      entityId: id,
      action: 'restore',
      performedBy: username,
      note: `Restored unit: ${unit.unitName}`,
    });
  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  return NextResponse.json({ unit });
}
