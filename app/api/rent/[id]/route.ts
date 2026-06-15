import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import RentRecord from '@/models/RentRecord';
import { createAuditLog, getChangedFields, sanitizeForAudit } from '@/lib/audit';
import { calculateRent } from '@/lib/calculations';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { id } = await params;
  const record = await RentRecord.findById(id)
    .populate('tenantId', 'name phone')
    .populate('leaseId', 'monthlyRentAmount advanceBalance collector')
    .populate('unitIds', 'unitName unitNumber')
    .populate('paymentIds')
    .lean();

  if (!record) return NextResponse.json({ error: 'Record not found' }, { status: 404 });
  return NextResponse.json({ record });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { id } = await params;
  const body = await req.json();
  const username = (session.user as any).username;

  const record = await RentRecord.findById(id);
  if (!record) return NextResponse.json({ error: 'Record not found' }, { status: 404 });

  const prevData = sanitizeForAudit(record.toObject());

  // Allow updating: extraCharges, discount, notes, and manual collected amount adjustment
  const updates: any = {};
  if (body.extraCharges !== undefined) updates.extraCharges = Number(body.extraCharges);
  if (body.discount !== undefined) updates.discount = Number(body.discount);
  if (body.notes !== undefined) updates.notes = body.notes;

  Object.assign(record, updates);

  // Recalculate
  const calc = calculateRent({
    baseRent: record.baseRent,
    previousDue: record.previousDue,
    extraCharges: record.extraCharges,
    discount: record.discount,
    advanceAdjustment: record.advanceAdjustment,
    collectedAmount: record.collectedAmount,
  });

  record.totalPayable = calc.totalPayable;
  record.dueAmount = calc.dueAmount;
  record.advanceCreated = calc.advanceCreated;
  record.status = calc.status;
  record.updatedBy = username;

  await record.save();

  await createAuditLog({
    entityType: 'rentRecord',
    entityId: id,
    action: 'update',
    performedBy: username,
    previousData: prevData,
    newData: sanitizeForAudit(record.toObject()),
    changedFields: getChangedFields(prevData, sanitizeForAudit(record.toObject())),
    note: `Updated rent record`,
  });

  return NextResponse.json({ record });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { id } = await params;
  const body = await req.json();
  const username = (session.user as any).username;

  const record = await RentRecord.findById(id);
  if (!record) return NextResponse.json({ error: 'Record not found' }, { status: 404 });

  if (body.action === 'archive') {
    record.status = 'archived';
    record.archivedAt = new Date();
    record.archivedBy = username;
    record.updatedBy = username;
    await record.save();

    await createAuditLog({
      entityType: 'rentRecord',
      entityId: id,
      action: 'archive',
      performedBy: username,
      note: `Archived rent record`,
    });
  }

  return NextResponse.json({ record });
}
