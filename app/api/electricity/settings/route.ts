import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import ElectricitySetting from '@/models/ElectricitySetting';
import { createAuditLog } from '@/lib/audit';
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
  const { month, year, globalRatePerUnit, notes } = parsed.data;

  const setting = await ElectricitySetting.findOneAndUpdate(
    { month, year },
    { globalRatePerUnit, notes, updatedBy: username, createdBy: username },
    { upsert: true, new: true }
  );

  await createAuditLog({
    entityType: 'setting',
    entityId: `elec-rate-${year}-${month}`,
    action: 'update',
    performedBy: username,
    newData: { month, year, globalRatePerUnit },
    note: `Set electricity rate for ${month}/${year}: ৳${globalRatePerUnit}/unit`,
  });

  return NextResponse.json({ setting }, { status: 201 });
}
