import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import RentRecord from '@/models/RentRecord';
import Lease from '@/models/Lease';
import { createAuditLog } from '@/lib/audit';
import { generateRentRecordSchema } from '@/lib/validators';
import { calculateRent, calculateAdvanceAdjustment } from '@/lib/calculations';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month');
  const year = searchParams.get('year');
  const tenantId = searchParams.get('tenantId');
  const leaseId = searchParams.get('leaseId');
  const status = searchParams.get('status');
  const collector = searchParams.get('collector');

  const query: any = { status: { $ne: 'archived' } };
  if (month) query.month = Number(month);
  if (year) query.year = Number(year);
  if (tenantId) query.tenantId = tenantId;
  if (leaseId) query.leaseId = leaseId;
  if (status) query.status = status;
  if (collector) query.collector = collector;

  const records = await RentRecord.find(query)
    .populate('tenantId', 'name phone')
    .populate('leaseId', 'monthlyRentAmount advanceBalance')
    .populate('unitIds', 'unitName unitNumber')
    .sort({ year: -1, month: -1, createdAt: -1 })
    .lean();

  return NextResponse.json({ records });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const body = await req.json();
  const parsed = generateRentRecordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }

  const username = (session.user as any).username;
  const { leaseId, month, year, extraCharges = 0, discount = 0, notes } = parsed.data;

  // Load lease
  const lease = await Lease.findById(leaseId).populate('unitIds', 'unitName assignedCollector');
  if (!lease) return NextResponse.json({ error: 'Lease not found' }, { status: 404 });
  if (lease.status !== 'active') {
    return NextResponse.json({ error: 'Can only generate rent for active leases' }, { status: 400 });
  }

  // Check if record already exists
  const existing = await RentRecord.findOne({ leaseId, month, year, status: { $ne: 'archived' } });
  if (existing) {
    return NextResponse.json({ error: `Rent record for ${month}/${year} already exists for this lease` }, { status: 409 });
  }

  // Find previous due from last month's record
  const lastMonth = month === 1 ? 12 : month - 1;
  const lastYear = month === 1 ? year - 1 : year;
  const prevRecord = await RentRecord.findOne({
    leaseId,
    month: lastMonth,
    year: lastYear,
    status: { $ne: 'archived' },
  });
  const previousDue = prevRecord?.dueAmount || 0;

  // Calculate advance adjustment
  const baseRent = lease.monthlyRentAmount;
  const rawPayable = baseRent + previousDue + extraCharges - discount;
  const { advanceAdjustment, remainingAdvance } = calculateAdvanceAdjustment(
    rawPayable,
    lease.advanceBalance
  );

  // Final calculation
  const result = calculateRent({
    baseRent,
    previousDue,
    extraCharges,
    discount,
    advanceAdjustment,
    collectedAmount: 0,
  });

  const record = await RentRecord.create({
    tenantId: lease.tenantId,
    leaseId: lease._id,
    unitIds: lease.unitIds,
    collector: lease.collector,
    month,
    year,
    baseRent: result.baseRent,
    previousDue: result.previousDue,
    extraCharges: result.extraCharges,
    discount: result.discount,
    advanceAdjustment: result.advanceAdjustment,
    totalPayable: result.totalPayable,
    collectedAmount: 0,
    dueAmount: result.dueAmount,
    advanceCreated: 0,
    status: result.status,
    notes,
    generatedBy: username,
    createdBy: username,
    updatedBy: username,
  });

  // Update lease advance balance if adjusted
  if (advanceAdjustment > 0) {
    lease.advanceBalance = remainingAdvance;
    await lease.save();
  }

  await createAuditLog({
    entityType: 'rentRecord',
    entityId: record._id.toString(),
    action: 'generate',
    performedBy: username,
    newData: { month, year, baseRent, totalPayable: result.totalPayable, advanceAdjustment },
    note: `Generated rent record for ${month}/${year}`,
  });

  return NextResponse.json({ record }, { status: 201 });
}
