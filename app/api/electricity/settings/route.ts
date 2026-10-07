import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import ElectricitySetting from '@/models/ElectricitySetting';
import ElectricityBill from '@/models/ElectricityBill';
import { createAuditLog } from '@/lib/audit';
import { billStatus, calculateElectricityBill } from '@/lib/calculations';
import { createElectricitySettingSchema } from '@/lib/validators';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month');
  const year = searchParams.get('year');

  if (month && year) {
    const setting = await ElectricitySetting.findOne({
      month: Number(month),
      year: Number(year),
    }).lean();
    return NextResponse.json({ setting });
  }

  const settings = await ElectricitySetting.find().sort({ year: -1, month: -1 }).lean();
  return NextResponse.json({ settings });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const body = await req.json();
  const parsed = createElectricitySettingSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }

  const username = (session.user as any).username;
  const { month, year, globalRatePerUnit, notes, applyToExisting } = parsed.data;

  const previous: any = await ElectricitySetting.findOne({ month, year }).lean();
  const setting = await ElectricitySetting.findOneAndUpdate(
    { month, year },
    {
      $set: { globalRatePerUnit, notes, updatedBy: username },
      $setOnInsert: { createdBy: username },
    },
    { upsert: true, new: true }
  );

  // Optionally re-price this month's bills that aren't fully paid. A bill is
  // skipped if it would end up costing less than what's already been paid.
  let repriced = 0;
  let skipped = 0;
  if (applyToExisting) {
    const bills = await ElectricityBill.find({ month, year, status: { $in: ['unpaid', 'partial'] } });
    for (const bill of bills) {
      const calc = calculateElectricityBill({
        previousReading: bill.previousReading,
        currentReading: bill.currentReading,
        globalRatePerUnit,
        manualAdjustment: bill.manualAdjustment,
      });
      if (calc.finalAmount < bill.paidAmount) {
        skipped++;
        continue;
      }
      bill.globalRatePerUnit = globalRatePerUnit;
      bill.calculatedAmount = calc.calculatedAmount;
      bill.finalAmount = calc.finalAmount;
      const { dueAmount, status } = billStatus(calc.finalAmount, bill.paidAmount);
      bill.dueAmount = dueAmount;
      bill.status = status;
      bill.updatedBy = username;
      await bill.save();
      repriced++;
    }
  }

  await createAuditLog({
    entityType: 'setting',
    entityId: `elec-rate-${year}-${month}`,
    action: 'update',
    performedBy: username,
    previousData: previous ? { globalRatePerUnit: previous.globalRatePerUnit } : undefined,
    newData: { month, year, globalRatePerUnit, repriced, skipped },
    note: `Set electricity rate for ${month}/${year}: ৳${globalRatePerUnit}/unit` +
      (applyToExisting ? ` (re-priced ${repriced} bill(s), skipped ${skipped})` : ''),
  });

  return NextResponse.json({ setting, repriced, skipped }, { status: 201 });
}
