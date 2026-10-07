import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Tenant from '@/models/Tenant';
import Unit from '@/models/Unit';
import { createAuditLog } from '@/lib/audit';
import { assertUnitsFree, createLease, LeaseError } from '@/lib/leases';
import { fromBn } from '@/lib/deed/bn';
import { agreementSchema, deedPart, isNA } from '@/lib/deed/schema';
import { translateError } from '@/lib/i18n';
import { getLang } from '@/lib/i18n/server';

// The one way to start a tenancy: the New agreement form. Adds the tenant
// (or updates a returning one), creates the lease with its rent and advance,
// and keeps the deed on the lease so it can be printed again.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const parsed = agreementSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }

  const username = (session.user as any).username;
  const lang = await getLang();
  const a = parsed.data;
  const fail = (message: string, status = 400) =>
    NextResponse.json({ error: translateError(lang, message) }, { status });

  // Units: they must exist, be free, and belong to one brother (he keeps the rent).
  const units: any[] = await Unit.find({ _id: { $in: a.unitIds }, status: { $ne: 'archived' } }).lean();
  if (units.length !== a.unitIds.length) return fail('Unit not found', 404);
  const owners = new Set(units.map((u) => u.assignedCollector));
  if (owners.size > 1) return fail("One agreement can only have one owner's shops or rooms");
  try {
    await assertUnitsFree(a.unitIds);
  } catch (e) {
    if (e instanceof LeaseError) {
      return NextResponse.json({ error: translateError(lang, e.message, e.vars) }, { status: e.status });
    }
    throw e;
  }

  // Tenant: what the deed says about them. Blank and N/A fields don't erase
  // what a returning tenant already has on file.
  const t = a.tenant;
  const profile = Object.fromEntries(
    Object.entries({
      name: t.name,
      phone: fromBn(t.mobile).replace(/[\s-]/g, ''),
      guardianName: t.father,
      dateOfBirth: t.dob ? new Date(t.dob) : undefined,
      nidNumber: t.nid,
      presentAddress: t.presentAddress,
      permanentAddress: t.permanentAddress,
      businessName: t.business,
      businessType: a.terms.trade,
      tradeLicenseNumber: t.tradeLicense,
    }).filter(([, v]) => v !== '' && v !== undefined && !(typeof v === 'string' && isNA(v))),
  );

  let tenant: any;
  let isNewTenant = false;
  if (a.tenantId) {
    tenant = await Tenant.findById(a.tenantId);
    if (!tenant || tenant.status === 'archived') return fail('Tenant not found', 404);
    Object.assign(tenant, profile, { updatedBy: username });
    await tenant.save();
  } else {
    tenant = await Tenant.create({ ...profile, status: 'active', createdBy: username, updatedBy: username });
    isNewTenant = true;
  }

  // Money the app keeps track of: the number, or 0 when the deed says N/A.
  const amount = (s: string) => (/^\d+$/.test(s) ? Number(s) : 0);
  const advanceMode = a.money.advanceMode || 'final';
  let lease;
  try {
    lease = await createLease(
      {
        tenantId: tenant._id.toString(),
        unitIds: a.unitIds,
        monthlyRentAmount: Number(a.money.rent),
        startDate: a.term.start,
        endDate: a.term.end || undefined,
        rentDueDay: 7, // deed clause ৩.২: rent is paid between the 1st and the 7th
        securityDepositAmount: 0, // the deed has one deposit: the advance
        advanceBalance: amount(a.money.advance),
        advanceMode,
        advancePerMonth: advanceMode === 'monthly' ? amount(a.money.advancePerMonth) : 0,
        collector: units[0].assignedCollector,
        deed: deedPart(a),
      },
      username,
    );
  } catch (e) {
    // Don't leave a tenant behind with no lease.
    if (isNewTenant) await Tenant.deleteOne({ _id: tenant._id });
    if (e instanceof LeaseError) {
      return NextResponse.json({ error: translateError(lang, e.message, e.vars) }, { status: e.status });
    }
    throw e;
  }

  await createAuditLog({
    entityType: 'tenant',
    entityId: tenant._id.toString(),
    action: isNewTenant ? 'create' : 'update',
    performedBy: username,
    newData: profile,
    note: `${isNewTenant ? 'Created' : 'Updated'} tenant from new agreement: ${tenant.name}`,
  });

  return NextResponse.json({ leaseId: lease._id.toString(), tenantId: tenant._id.toString() }, { status: 201 });
}
