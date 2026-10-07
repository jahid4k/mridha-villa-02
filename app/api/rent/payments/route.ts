import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Payment from '@/models/Payment';
import RentRecord from '@/models/RentRecord';
import { recordPaymentSchema } from '@/lib/validators';
import { CollectError, recordCollection } from '@/lib/collect';
import { translateError } from '@/lib/i18n';
import { getLang } from '@/lib/i18n/server';

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

// Older endpoint, kept for compatibility: a payment against one rent record
// (or, with no record, money kept as credit). Goes through the same
// collection logic as /api/collect, so it gets a receipt and allocations.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const parsed = recordPaymentSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }

  const { monthlyRentRecordId, tenantId, amount, paymentDate, paymentMethod, receivedBy, notes } = parsed.data;
  const record: any = monthlyRentRecordId ? await RentRecord.findById(monthlyRentRecordId).lean() : null;
  if (monthlyRentRecordId && (!record || record.status === 'archived')) {
    return NextResponse.json({ error: 'Rent record not found' }, { status: 404 });
  }

  try {
    const result = await recordCollection({
      tenantId: record ? String(record.tenantId) : tenantId,
      amount,
      paymentDate,
      paymentMethod,
      receivedBy,
      notes,
      targets: record ? [{ kind: 'rent', id: String(record._id) }] : [],
      allowCredit: true,
    }, (session.user as any).username);
    return NextResponse.json({ payment: result.payment }, { status: 201 });
  } catch (e) {
    if (e instanceof CollectError) {
      return NextResponse.json({ error: translateError(await getLang(), e.message, e.vars) }, { status: e.status });
    }
    throw e;
  }
}
