import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Payment from '@/models/Payment';
import RentRecord from '@/models/RentRecord';
import Lease from '@/models/Lease';
import { createAuditLog } from '@/lib/audit';
import { recordPaymentSchema } from '@/lib/validators';
import { calculateRent } from '@/lib/calculations';
import { generateReceiptNumber } from '@/lib/formatters';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { searchParams } = new URL(req.url);
  const tenantId = searchParams.get('tenantId');
  const leaseId = searchParams.get('leaseId');
  const recordId = searchParams.get('recordId');

  const query: any = { archivedAt: null };
  if (tenantId) query.tenantId = tenantId;
  if (leaseId) query.leaseId = leaseId;
  if (recordId) query.monthlyRentRecordId = recordId;

  const payments = await Payment.find(query)
    .populate('tenantId', 'name phone')
    .sort({ paymentDate: -1 })
    .lean();

  return NextResponse.json({ payments });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const body = await req.json();
  const parsed = recordPaymentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }

  const username = (session.user as any).username;
  const { tenantId, leaseId, monthlyRentRecordId, amount, paymentType } = parsed.data;

  // Create payment
  const payment = await Payment.create({
    ...parsed.data,
    paymentDate: new Date(parsed.data.paymentDate),
    receiptNumber: parsed.data.receiptNumber || generateReceiptNumber(),
    attachments: [],
    createdBy: username,
    updatedBy: username,
  });

  // If linked to a rent record, update it
  if (monthlyRentRecordId) {
    const record = await RentRecord.findById(monthlyRentRecordId);
    if (record) {
      record.collectedAmount += amount;
      record.paymentIds.push(payment._id);

      const calc = calculateRent({
        baseRent: record.baseRent,
        previousDue: record.previousDue,
        extraCharges: record.extraCharges,
        discount: record.discount,
        advanceAdjustment: record.advanceAdjustment,
        collectedAmount: record.collectedAmount,
      });

      record.dueAmount = calc.dueAmount;
      record.advanceCreated = calc.advanceCreated;
      record.status = calc.status;
      record.updatedBy = username;
      await record.save();

      // If overpaid, add to lease advance balance
      if (calc.advanceCreated > 0) {
        await Lease.findByIdAndUpdate(leaseId, {
          $inc: { advanceBalance: calc.advanceCreated },
          updatedBy: username,
        });
      }
    }
  } else if (paymentType === 'advance') {
    // Pure advance payment — add to lease balance
    await Lease.findByIdAndUpdate(leaseId, {
      $inc: { advanceBalance: amount },
      updatedBy: username,
    });
  }

  await createAuditLog({
    entityType: 'payment',
    entityId: payment._id.toString(),
    action: 'payment',
    performedBy: username,
    newData: {
      amount,
      paymentType,
      paymentMethod: parsed.data.paymentMethod,
      receivedBy: parsed.data.receivedBy,
    },
    note: `Payment of ৳${amount} recorded`,
  });

  return NextResponse.json({ payment }, { status: 201 });
}
