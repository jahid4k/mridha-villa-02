import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import GasBill from '@/models/GasBill';
import { createAuditLog, getChangedFields, sanitizeForAudit } from '@/lib/audit';
import { createGasBillSchema } from '@/lib/validators';

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

  const bills = await GasBill.find(query)
    .populate('tenantId', 'name phone')
    .populate('unitIds', 'unitName unitNumber')
    .sort({ year: -1, month: -1 })
    .lean();

  return NextResponse.json({ bills });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const body = await req.json();
  const parsed = createGasBillSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }

  const username = (session.user as any).username;
  const bill = await GasBill.create({
    ...parsed.data,
    paidAmount: 0,
    dueAmount: parsed.data.amount,
    status: 'unpaid',
    createdBy: username,
    updatedBy: username,
  });

  await createAuditLog({
    entityType: 'gasBill',
    entityId: bill._id.toString(),
    action: 'create',
    performedBy: username,
    newData: parsed.data,
    note: `Created gas bill: ৳${parsed.data.amount}`,
  });

  return NextResponse.json({ bill }, { status: 201 });
}
