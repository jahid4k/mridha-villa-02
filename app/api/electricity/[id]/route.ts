import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import ElectricityBill from '@/models/ElectricityBill';
import { createAuditLog, getChangedFields, sanitizeForAudit } from '@/lib/audit';
import { billStatus, calculateElectricityBill } from '@/lib/calculations';
import { editElectricityBillSchema, payBillSchema } from '@/lib/validators';
import { CollectError, recordCollection } from '@/lib/collect';
import { translateError } from '@/lib/i18n';
import { getLang } from '@/lib/i18n/server';
import { todayInDhaka } from '@/lib/formatters';

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
  const parsed = payBillSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }
  const username = (session.user as any).username;
  const { amount, paymentDate, notes } = parsed.data;

  const bill = await ElectricityBill.findById(id);
  if (!bill) return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
  if (bill.status === 'archived') {
    return NextResponse.json({ error: 'This bill is archived' }, { status: 400 });
  }
  if (bill.dueAmount <= 0) {
    return NextResponse.json({ error: 'This bill is already fully paid' }, { status: 400 });
  }
  if (amount > bill.dueAmount) {
    return NextResponse.json(
      { error: translateError(await getLang(), 'Amount is more than the due ({amount})', { amount: { bdt: bill.dueAmount } }) },
      { status: 400 },
    );
  }

  // Same path as the Collect screen: one Payment with a receipt, added on top
  // of what was already paid.
  try {
    await recordCollection({
      tenantId: String(bill.tenantId),
      amount,
      paymentDate: paymentDate || todayInDhaka(),
      paymentMethod: 'cash',
      receivedBy: username,
      notes,
      targets: [{ kind: 'electricity', id }],
      allowCredit: false,
    }, username);
  } catch (e) {
    if (e instanceof CollectError) {
      return NextResponse.json({ error: translateError(await getLang(), e.message, e.vars) }, { status: e.status });
    }
    throw e;
  }

  return NextResponse.json({ bill: await ElectricityBill.findById(id).lean() });
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
  if (bill.status === 'archived') {
    return NextResponse.json({ error: 'This bill is already archived' }, { status: 400 });
  }

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
    return NextResponse.json({ bill });
  }

  if (body.action === 'edit') {
    const parsed = editElectricityBillSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }
    const { previousReading, currentReading, manualAdjustment, notes } = parsed.data;

    // Re-price with the bill's own rate; the rate modal re-prices a whole month.
    const calc = calculateElectricityBill({
      previousReading,
      currentReading,
      globalRatePerUnit: bill.globalRatePerUnit,
      manualAdjustment,
    });
    if (calc.finalAmount < bill.paidAmount) {
      return NextResponse.json(
        { error: translateError(await getLang(), '{paid} is already paid, more than the corrected amount ({amount})', { paid: { bdt: bill.paidAmount }, amount: { bdt: calc.finalAmount } }) },
        { status: 400 },
      );
    }

    const prevData = sanitizeForAudit(bill.toObject());
    bill.previousReading = previousReading;
    bill.currentReading = currentReading;
    bill.consumedUnits = calc.consumedUnits;
    bill.calculatedAmount = calc.calculatedAmount;
    bill.manualAdjustment = calc.manualAdjustment;
    bill.finalAmount = calc.finalAmount;
    const { dueAmount, status } = billStatus(bill.finalAmount, bill.paidAmount);
    bill.dueAmount = dueAmount;
    bill.status = status;
    if (notes !== undefined) bill.notes = notes;
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
      note: `Corrected electricity bill: ${calc.consumedUnits} units = ৳${calc.finalAmount}`,
    });
    return NextResponse.json({ bill });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
