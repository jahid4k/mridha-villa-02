import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import ElectricityBill from '@/models/ElectricityBill';
import { createAuditLog, getChangedFields, sanitizeForAudit } from '@/lib/audit';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { id } = await params;
  const bill = await ElectricityBill.findById(id)
    .populate('tenantId', 'name phone')
    .populate('unitId', 'unitName unitNumber electricityMeterNumber')
    .lean();

  if (!bill) return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
  return NextResponse.json({ bill });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { id } = await params;
  const body = await req.json();
  const username = (session.user as any).username;

  const bill = await ElectricityBill.findById(id);
  if (!bill) return NextResponse.json({ error: 'Bill not found' }, { status: 404 });

  const prevData = sanitizeForAudit(bill.toObject());

  // Record payment
  if (body.paidAmount !== undefined) {
    const newPaid = Math.min(Number(body.paidAmount), bill.finalAmount);
    bill.paidAmount = newPaid;
    bill.dueAmount = Math.max(0, bill.finalAmount - newPaid);
    bill.paymentDate = body.paymentDate ? new Date(body.paymentDate) : new Date();

    if (bill.dueAmount === 0) bill.status = 'paid';
    else if (newPaid > 0) bill.status = 'partial';
    else bill.status = 'unpaid';
  }

  if (body.notes) bill.notes = body.notes;
  bill.updatedBy = username;
  await bill.save();

  await createAuditLog({
    entityType: 'electricityBill',
    entityId: id,
    action: 'update',
    performedBy: username,
    previousData: prevData,
    newData: sanitizeForAudit(bill.toObject()),
    changedFields: getChangedFields(prevData, sanitizeForAudit(bill.toObject())),
    note: `Updated electricity bill payment`,
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

  const bill = await ElectricityBill.findById(id);
  if (!bill) return NextResponse.json({ error: 'Bill not found' }, { status: 404 });

  if (body.action === 'archive') {
    bill.status = 'archived';
    bill.archivedAt = new Date();
    bill.archivedBy = username;
    bill.updatedBy = username;
    await bill.save();

    await createAuditLog({
      entityType: 'electricityBill',
      entityId: id,
      action: 'archive',
      performedBy: username,
      note: `Archived electricity bill`,
    });
  }

  return NextResponse.json({ bill });
}
