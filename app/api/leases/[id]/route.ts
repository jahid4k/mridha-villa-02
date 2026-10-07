import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Lease from '@/models/Lease';
import Unit from '@/models/Unit';
import Tenant from '@/models/Tenant';
import { createAuditLog, getChangedFields, sanitizeForAudit } from '@/lib/audit';
import { ensureMonthlyCharges } from '@/lib/billing';
import { translateError } from '@/lib/i18n';
import { getLang } from '@/lib/i18n/server';
import { updateLeaseSchema } from '@/lib/validators';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { id } = await params;
  const lease = await Lease.findById(id)
    .populate('tenantId', 'name phone businessName nidNumber permanentAddress guardianName profilePhoto email')
    .populate('unitIds', 'unitName unitNumber unitType assignedCollector floorOrLocation hasElectricitySubMeter')
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
  const prevUnitIds = existing.unitIds.map((u: any) => String(u));

  // Changing units on an active lease: the new units must not be rented elsewhere.
  const newUnitIds = parsed.data.unitIds;
  if (newUnitIds && existing.status === 'active') {
    const conflicting = await Lease.find({
      _id: { $ne: existing._id },
      unitIds: { $in: newUnitIds },
      status: 'active',
    })
      .populate('tenantId', 'name')
      .populate('unitIds', 'unitName');
    if (conflicting.length > 0) {
      const taken = conflicting.flatMap((l: any) =>
        l.unitIds
          .filter((u: any) => newUnitIds.includes(String(u._id)))
          .map((u: any) => `${u.unitName} (${l.tenantId?.name ?? 'another tenant'})`),
      );
      return NextResponse.json(
        { error: translateError(await getLang(), 'Already rented: {units}. End that lease first.', { units: taken.join(', ') }) },
        { status: 409 },
      );
    }
  }

  if (parsed.data.startDate) parsed.data.startDate = new Date(parsed.data.startDate) as any;
  if (parsed.data.endDate) parsed.data.endDate = new Date(parsed.data.endDate) as any;

  Object.assign(existing, parsed.data, { updatedBy: username });
  await existing.save();

  // Keep unit occupancy in step with the lease's units.
  if (newUnitIds && existing.status === 'active') {
    const removed = prevUnitIds.filter((u: string) => !newUnitIds.includes(u));
    if (removed.length > 0) {
      await Unit.updateMany(
        { _id: { $in: removed }, currentLeaseId: existing._id },
        { status: 'vacant', $unset: { currentLeaseId: '', currentTenantId: '' }, updatedBy: username },
      );
    }
    await Unit.updateMany(
      { _id: { $in: newUnitIds } },
      { status: 'occupied', currentLeaseId: existing._id, currentTenantId: existing.tenantId, updatedBy: username },
    );
  }

  if (existing.status === 'active') {
    await ensureMonthlyCharges({ leaseId: id });
  }

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

    // Free up units, but only those still pointing at this lease.
    await Unit.updateMany(
      {
        _id: { $in: lease.unitIds },
        $or: [{ currentLeaseId: lease._id }, { currentLeaseId: null }],
      },
      {
        status: 'vacant',
        $unset: { currentLeaseId: '', currentTenantId: '' },
        updatedBy: username,
      }
    );

    // The tenant becomes "previous" only if they have no other active lease.
    const otherActive = await Lease.exists({
      tenantId: lease.tenantId,
      status: 'active',
      _id: { $ne: lease._id },
    });
    if (!otherActive) {
      await Tenant.findByIdAndUpdate(lease.tenantId, {
        status: 'previous',
        updatedBy: username,
      });
    }

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
