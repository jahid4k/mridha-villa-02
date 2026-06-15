import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Lease from '@/models/Lease';
import Unit from '@/models/Unit';
import Tenant from '@/models/Tenant';
import { createAuditLog } from '@/lib/audit';
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

  // Check for conflicting active leases on these units
  const conflictingLeases = await Lease.find({
    unitIds: { $in: parsed.data.unitIds },
    status: 'active',
  }).populate('tenantId', 'name');

  // Build the lease
  const lease = await Lease.create({
    ...parsed.data,
    startDate: new Date(parsed.data.startDate),
    endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
    createdBy: username,
    updatedBy: username,
  });

  // Update units to occupied
  await Unit.updateMany(
    { _id: { $in: parsed.data.unitIds } },
    {
      status: 'occupied',
      currentLeaseId: lease._id,
      currentTenantId: parsed.data.tenantId,
      updatedBy: username,
    }
  );

  // Update tenant's active leases
  await Tenant.findByIdAndUpdate(parsed.data.tenantId, {
    $addToSet: { activeLeaseIds: lease._id },
    status: 'active',
    updatedBy: username,
  });

  await createAuditLog({
    entityType: 'lease',
    entityId: lease._id.toString(),
    action: 'create',
    performedBy: username,
    newData: parsed.data,
    note: `Created lease for tenant`,
  });

  const populatedLease = await Lease.findById(lease._id)
    .populate('tenantId', 'name phone')
    .populate('unitIds', 'unitName unitNumber');

  return NextResponse.json({
    lease: populatedLease,
    conflictWarning: conflictingLeases.length > 0
      ? `Warning: Some units already have active leases`
      : null,
  }, { status: 201 });
}
