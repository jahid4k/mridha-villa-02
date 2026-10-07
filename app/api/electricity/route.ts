import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import ElectricityBill from '@/models/ElectricityBill';
import { createElectricityBillSchema } from '@/lib/validators';
import { BillError, createElectricityBill, resolveElectricityRate } from '@/lib/electricity';
import { translateError } from '@/lib/i18n';
import { getLang } from '@/lib/i18n/server';

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
  const { month, year, ...reading } = parsed.data;

  const rate = await resolveElectricityRate(month, year);
  if (!rate) {
    return NextResponse.json({ error: 'Set an electricity rate first' }, { status: 400 });
  }

  try {
    const bill = await createElectricityBill(reading, month, year, rate, username);
    return NextResponse.json({ bill }, { status: 201 });
  } catch (e) {
    if (e instanceof BillError) {
      return NextResponse.json({ error: translateError(await getLang(), e.message, e.vars) }, { status: e.status });
    }
    throw e;
  }
}
