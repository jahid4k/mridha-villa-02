import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import ElectricityBill from '@/models/ElectricityBill';
import ElectricitySetting from '@/models/ElectricitySetting';
import { createAuditLog } from '@/lib/audit';
import { createElectricityBillSchema } from '@/lib/validators';
import { calculateElectricityBill } from '@/lib/calculations';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month');
  const year = searchParams.get('year');
  const tenantId = searchParams.get('tenantId');
  const status = searchParams.get('status');

  const query: any = { status: { $ne: 'archived' } };
  if (month) query.month = Number(month);
  if (year) query.year = Number(year);
  if (tenantId) query.tenantId = tenantId;
  if (status) query.status = status;

  const bills = await ElectricityBill.find(query)
    .populate('tenantId', 'name phone')
    .populate('unitId', 'unitName unitNumber electricityMeterNumber')
    .sort({ year: -1, month: -1 })
    .lean();

  return NextResponse.json({ bills });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const body = await req.json();
  const parsed = createElectricityBillSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }

  const username = (session.user as any).username;
  const { month, year } = parsed.data;

  // Get or use provided rate
  let globalRatePerUnit = parsed.data.globalRatePerUnit;
  if (!globalRatePerUnit) {
    const setting = await ElectricitySetting.findOne({ month, year });
    globalRatePerUnit = setting?.globalRatePerUnit || 12;
  }

  const calc = calculateElectricityBill({
    previousReading: parsed.data.previousReading,
    currentReading: parsed.data.currentReading,
    globalRatePerUnit,
    manualAdjustment: parsed.data.manualAdjustment || 0,
  });

  const bill = await ElectricityBill.create({
    ...parsed.data,
    globalRatePerUnit,
    consumedUnits: calc.consumedUnits,
    calculatedAmount: calc.calculatedAmount,
    finalAmount: calc.finalAmount,
    dueAmount: calc.finalAmount,
    paidAmount: 0,
    status: 'unpaid',
    createdBy: username,
    updatedBy: username,
  });

  await createAuditLog({
    entityType: 'electricityBill',
    entityId: bill._id.toString(),
    action: 'create',
    performedBy: username,
    newData: { month, year, consumedUnits: calc.consumedUnits, finalAmount: calc.finalAmount },
    note: `Created electricity bill: ${calc.consumedUnits} units @ ৳${globalRatePerUnit}/unit = ৳${calc.finalAmount}`,
  });

  return NextResponse.json({ bill }, { status: 201 });
}
