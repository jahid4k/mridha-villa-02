import Lease from '@/models/Lease';
import Unit from '@/models/Unit';
import Tenant from '@/models/Tenant';
import { createAuditLog } from '@/lib/audit';
import { ensureMonthlyCharges } from '@/lib/billing';
import type { ErrorVars } from '@/lib/i18n';
import type { CreateLeaseInput } from '@/lib/validators';

// Starting a tenancy (server-only). Used by the New agreement form and the
// leases API, so both follow the same rules.

/** message is an English template; routes translate it with vars. */
export class LeaseError extends Error {
  constructor(message: string, public status = 400, public vars?: ErrorVars) {
    super(message);
  }
}

/** A unit can only be on one active lease at a time. */
export async function assertUnitsFree(unitIds: string[]) {
  const conflicting = await Lease.find({ unitIds: { $in: unitIds }, status: 'active' })
    .populate('tenantId', 'name')
    .populate('unitIds', 'unitName');
  if (conflicting.length === 0) return;

  const taken = conflicting.flatMap((l: any) =>
    l.unitIds
      .filter((u: any) => unitIds.includes(String(u._id)))
      .map((u: any) => `${u.unitName} (${l.tenantId?.name ?? 'another tenant'})`),
  );
  throw new LeaseError('Already rented: {units}. End that lease first.', 409, { units: taken.join(', ') });
}

/**
 * Create the lease, mark its units occupied and the tenant active, and charge
 * its months up to now (e.g. the current month's rent).
 */
export async function createLease(
  data: CreateLeaseInput & { deed?: Record<string, any> },
  username: string,
) {
  await assertUnitsFree(data.unitIds);

  const lease = await Lease.create({
    ...data,
    startDate: new Date(data.startDate),
    endDate: data.endDate ? new Date(data.endDate) : undefined,
    createdBy: username,
    updatedBy: username,
  });

  await Unit.updateMany(
    { _id: { $in: data.unitIds } },
    {
      status: 'occupied',
      currentLeaseId: lease._id,
      currentTenantId: data.tenantId,
      updatedBy: username,
    },
  );

  await Tenant.findByIdAndUpdate(data.tenantId, {
    status: 'active',
    updatedBy: username,
  });

  await createAuditLog({
    entityType: 'lease',
    entityId: lease._id.toString(),
    action: 'create',
    performedBy: username,
    newData: data,
    note: `Created lease for tenant`,
  });

  await ensureMonthlyCharges({ leaseId: lease._id.toString() });

  return lease;
}
