import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Lease from '@/models/Lease';
import Unit from '@/models/Unit';
import Tenant from '@/models/Tenant';
import { createAuditLog, getChangedFields, sanitizeForAudit } from '@/lib/audit';
import { updateLeaseSchema } from '@/lib/validators';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { id } = await params;
  const lease = await Lease.findById(id)
    .populate('tenantId', 'name phone businessName')
    .populate('unitIds', 'unitName unitNumber unitType assignedCollector')
    .lean();

  if (!lease) return NextResponse.json({ error: 'Lease not found' }, { status: 404 });
  return NextResponse.json({ lease });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { id } = await params;
  const body = await req.json();
  const parsed = updateLeaseSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await Lease.findById(id);
  if (!existing) return NextResponse.json({ error: 'Lease not found' }, { status: 404 });
  if (existing.status === 'archived') {
    return NextResponse.json({ error: 'Cannot edit archived lease.' }, { status: 400 });
  }

  const username = (session.user as any).username;
  const prevData = sanitizeForAudit(existing.toObject());

  if (parsed.data.startDate) parsed.data.startDate = new Date(parsed.data.startDate) as any;
  if (parsed.data.endDate) parsed.data.endDate = new Date(parsed.data.endDate) as any;

  Object.assign(existing, parsed.data, { updatedBy: username });
  await existing.save();

  await createAuditLog({
    entityType: 'lease',
    entityId: id,
    action: 'update',
    performedBy: username,
    previousData: prevData,
    newData: sanitizeForAudit(existing.toObject()),
    changedFields: getChangedFields(prevData, sanitizeForAudit(existing.toObject())),
    note: `Updated lease`,
  });

  return NextResponse.json({ lease: existing });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { id } = await params;
  const body = await req.json();
  const username = (session.user as any).username;

  const lease = await Lease.findById(id);
  if (!lease) return NextResponse.json({ error: 'Lease not found' }, { status: 404 });

  if (body.action === 'end') {
    lease.status = 'ended';
    lease.endDate = new Date();
    lease.updatedBy = username;
    await lease.save();

    // Free up units
    await Unit.updateMany(
      { _id: { $in: lease.unitIds } },
      {
        status: 'vacant',
        $unset: { currentLeaseId: '', currentTenantId: '' },
        updatedBy: username,
      }
    );

    // Remove from tenant active leases
    await Tenant.findByIdAndUpdate(lease.tenantId, {
      $pull: { activeLeaseIds: lease._id },
      status: 'previous',
      updatedBy: username,
    });

    await createAuditLog({
      entityType: 'lease',
      entityId: id,
      action: 'update',
      performedBy: username,
      note: `Ended lease`,
    });
  } else if (body.action === 'archive') {
    lease.status = 'archived';
    lease.archivedAt = new Date();
    lease.archivedBy = username;
    lease.updatedBy = username;
    await lease.save();

    await createAuditLog({
      entityType: 'lease',
      entityId: id,
      action: 'archive',
      performedBy: username,
      note: `Archived lease`,
    });
  } else if (body.action === 'restore') {
    lease.status = 'active';
    lease.archivedAt = undefined;
    lease.archivedBy = undefined;
    lease.updatedBy = username;
    await lease.save();

    await createAuditLog({
      entityType: 'lease',
      entityId: id,
      action: 'restore',
      performedBy: username,
      note: `Restored lease`,
    });
  } else if (body.action === 'adjustAdvance') {
    const amount = Number(body.amount);
    if (isNaN(amount)) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });

    const prevBalance = lease.advanceBalance;
    lease.advanceBalance = Math.max(0, lease.advanceBalance + amount);
    lease.updatedBy = username;
    await lease.save();

    await createAuditLog({
      entityType: 'lease',
      entityId: id,
      action: 'adjustment',
      performedBy: username,
      previousData: { advanceBalance: prevBalance },
      newData: { advanceBalance: lease.advanceBalance },
      note: `Advance balance adjusted by ${amount}`,
    });
  }

  return NextResponse.json({ lease });
}
