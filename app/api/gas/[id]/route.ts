import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import GasBill from '@/models/GasBill';
import { createAuditLog, getChangedFields, sanitizeForAudit } from '@/lib/audit';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { id } = await params;
  const body = await req.json();
  const username = (session.user as any).username;

  const bill = await GasBill.findById(id);
  if (!bill) return NextResponse.json({ error: 'Bill not found' }, { status: 404 });

  const prevData = sanitizeForAudit(bill.toObject());

  if (body.paidAmount !== undefined) {
    const newPaid = Math.min(Number(body.paidAmount), bill.amount);
    bill.paidAmount = newPaid;
    bill.dueAmount = Math.max(0, bill.amount - newPaid);
    bill.paymentDate = body.paymentDate ? new Date(body.paymentDate) : new Date();

    if (bill.dueAmount === 0) bill.status = 'paid';
    else if (newPaid > 0) bill.status = 'partial';
    else bill.status = 'unpaid';
  }

  if (body.notes !== undefined) bill.notes = body.notes;
  bill.updatedBy = username;
  await bill.save();

  await createAuditLog({
    entityType: 'gasBill',
    entityId: id,
    action: 'update',
    performedBy: username,
    previousData: prevData,
    newData: sanitizeForAudit(bill.toObject()),
    changedFields: getChangedFields(prevData, sanitizeForAudit(bill.toObject())),
    note: `Updated gas bill payment`,
  });

  return NextResponse.json({ bill });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { id } = await params;
  const body = await req.json();
  const username = (session.user as any).username;

  const bill = await GasBill.findById(id);
  if (!bill) return NextResponse.json({ error: 'Bill not found' }, { status: 404 });

  if (body.action === 'archive') {
    bill.status = 'archived';
    bill.archivedAt = new Date();
    bill.archivedBy = username;
    bill.updatedBy = username;
    await bill.save();

    await createAuditLog({
      entityType: 'gasBill',
      entityId: id,
      action: 'archive',
      performedBy: username,
      note: `Archived gas bill`,
    });
  }

  return NextResponse.json({ bill });
}
