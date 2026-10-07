import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Lease from '@/models/Lease';
import { createLease, LeaseError } from '@/lib/leases';
import { translateError } from '@/lib/i18n';
import { getLang } from '@/lib/i18n/server';
import { createLeaseSchema } from '@/lib/validators';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const tenantId = searchParams.get('tenantId');
  const unitId = searchParams.get('unitId');

  const query: any = {};
  if (status) query.status = status;
  else query.status = { $ne: 'archived' };
  if (tenantId) query.tenantId = tenantId;
  if (unitId) query.unitIds = unitId;

  const leases = await Lease.find(query)
    .populate('tenantId', 'name phone')
    .populate('unitIds', 'unitName unitNumber unitType assignedCollector')
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ leases });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const body = await req.json();
  const parsed = createLeaseSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }

  const username = (session.user as any).username;

  let lease;
  try {
    lease = await createLease(parsed.data, username);
  } catch (e) {
    if (e instanceof LeaseError) {
      return NextResponse.json({ error: translateError(await getLang(), e.message, e.vars) }, { status: e.status });
    }
    throw e;
  }

  const populatedLease = await Lease.findById(lease._id)
    .populate('tenantId', 'name phone')
    .populate('unitIds', 'unitName unitNumber');

  return NextResponse.json({ lease: populatedLease }, { status: 201 });
}
