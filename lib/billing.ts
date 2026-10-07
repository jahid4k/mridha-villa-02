import Lease from '@/models/Lease';
import RentRecord from '@/models/RentRecord';
import GasBill from '@/models/GasBill';
import Setting from '@/models/Setting';
import { createAuditLog } from '@/lib/audit';
import { calculateRent } from '@/lib/calculations';
import {
  fromYearMonth,
  getCurrentMonthYear,
  getMonthYearLabel,
  monthYearInDhaka,
  nextYearMonth,
  toYearMonth,
} from '@/lib/formatters';

// Automatic monthly charges (server-only).
//
// Every active lease is charged a full month's rent for each calendar month
// from its start month (we always count from the 1st), plus the fixed gas
// charge of its units. ensureMonthlyCharges() is safe to call any number of
// times: each lease remembers the last month charged (chargedThrough) and
// claims the next month atomically, so a month is never charged twice and
// missed months are caught up.

const SYSTEM = 'system';
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * The first month automatic billing covers: the month the app first ran.
 * Existing tenants entered later with old deed start dates are not billed
 * for the years before that.
 */
async function billingStartsFrom(): Promise<number> {
  const { month, year } = getCurrentMonthYear();
  const setting: any = await Setting.findOneAndUpdate(
    { key: 'billingStartsFrom' },
    {
      $setOnInsert: {
        value: toYearMonth(month, year),
        label: 'Automatic billing starts from (YYYYMM)',
        updatedBy: SYSTEM,
      },
    },
    { upsert: true, new: true },
  ).lean();
  return Number(setting.value);
}

interface RentOptions {
  extraCharges?: number;
  discount?: number;
  notes?: string;
}

/**
 * Create one month's rent record for a lease. Applies the lease's advance
 * rule (deduct advancePerMonth, or keep until move-out) and then any credit
 * from earlier overpayments, and takes both off the lease's balances.
 * `lease` must be a plain object; its balances are updated in place so the
 * next month in the same run sees the new values.
 */
export async function createRentRecord(
  lease: any,
  month: number,
  year: number,
  options: RentOptions = {},
  username = SYSTEM,
) {
  const baseRent = lease.monthlyRentAmount;
  const extraCharges = options.extraCharges || 0;
  const discount = options.discount || 0;
  const payable = Math.max(0, baseRent + extraCharges - discount);

  const advance = lease.advanceMode === 'monthly'
    ? round2(Math.min(lease.advancePerMonth || 0, lease.advanceBalance || 0, payable))
    : 0;
  const credit = round2(Math.min(lease.creditBalance || 0, payable - advance));

  const calc = calculateRent({ baseRent, extraCharges, discount, advanceAdjustment: advance + credit });

  const record = await RentRecord.create({
    tenantId: lease.tenantId?._id ?? lease.tenantId,
    leaseId: lease._id,
    unitIds: (lease.unitIds || []).map((u: any) => u?._id ?? u),
    collector: lease.collector,
    month,
    year,
    baseRent: calc.baseRent,
    previousDue: 0, // dues stay on their own month; nothing is copied forward
    extraCharges: calc.extraCharges,
    discount: calc.discount,
    advanceAdjustment: calc.advanceAdjustment,
    creditApplied: credit,
    totalPayable: calc.totalPayable,
    collectedAmount: 0,
    dueAmount: calc.dueAmount,
    advanceCreated: 0,
    status: calc.status,
    notes: options.notes,
    generatedBy: username,
    createdBy: username,
    updatedBy: username,
  });

  if (advance > 0 || credit > 0) {
    await Lease.updateOne(
      { _id: lease._id },
      { $inc: { advanceBalance: -advance, creditBalance: -credit } },
    );
    lease.advanceBalance = round2((lease.advanceBalance || 0) - advance);
    lease.creditBalance = round2((lease.creditBalance || 0) - credit);
  }

  return record;
}

/** The fixed monthly gas charge for a lease: the sum of its units' charges. */
function gasChargeFor(lease: any): number {
  return round2((lease.unitIds || []).reduce((s: number, u: any) => s + (u?.gasMonthlyCharge || 0), 0));
}

/**
 * Charge every active lease (or one lease) for all months up to the current
 * one that haven't been charged yet. Returns how many records were created.
 */
export async function ensureMonthlyCharges(options: { leaseId?: string } = {}) {
  const { month: curMonth, year: curYear } = getCurrentMonthYear();
  const currentYm = toYearMonth(curMonth, curYear);
  const floor = await billingStartsFrom();

  const leases: any[] = await Lease.find({
    status: 'active',
    ...(options.leaseId ? { _id: options.leaseId } : {}),
    $or: [{ chargedThrough: { $lt: currentYm } }, { chargedThrough: null }],
  })
    .populate('unitIds', 'unitName gasMonthlyCharge')
    .lean();

  let rentCreated = 0;
  let gasCreated = 0;

  for (const lease of leases) {
    const start = monthYearInDhaka(new Date(lease.startDate));
    let ym = Math.max(floor, toYearMonth(start.month, start.year));
    if (lease.chargedThrough) ym = Math.max(ym, nextYearMonth(lease.chargedThrough));

    while (ym <= currentYm) {
      // Claim this month. If another request already moved chargedThrough on,
      // it is doing the work, so stop here.
      const previous = lease.chargedThrough ?? null;
      const claim = await Lease.updateOne(
        { _id: lease._id, chargedThrough: previous },
        { $set: { chargedThrough: ym } },
      );
      if (claim.modifiedCount === 0) break;
      lease.chargedThrough = ym;

      const { month, year } = fromYearMonth(ym);
      try {
        // A record may already exist (made by hand, or archived on purpose): leave it.
        if (!(await RentRecord.exists({ leaseId: lease._id, month, year }))) {
          await createRentRecord(lease, month, year);
          rentCreated++;
        }

        const gas = gasChargeFor(lease);
        if (gas > 0 && !(await GasBill.exists({ leaseId: lease._id, month, year }))) {
          await GasBill.create({
            tenantId: lease.tenantId,
            leaseId: lease._id,
            unitIds: lease.unitIds.map((u: any) => u._id),
            month,
            year,
            amount: gas,
            paidAmount: 0,
            dueAmount: gas,
            status: 'unpaid',
            notes: 'Fixed monthly gas charge',
            createdBy: SYSTEM,
            updatedBy: SYSTEM,
          });
          gasCreated++;
        }
      } catch (e) {
        // Give the month back so the next run tries it again.
        await Lease.updateOne(
          { _id: lease._id, chargedThrough: ym },
          previous === null ? { $unset: { chargedThrough: 1 } } : { $set: { chargedThrough: previous } },
        );
        throw e;
      }

      ym = nextYearMonth(ym);
    }
  }

  if (rentCreated > 0 || gasCreated > 0) {
    await createAuditLog({
      entityType: 'rentRecord',
      entityId: `auto-${currentYm}`,
      action: 'generate',
      performedBy: SYSTEM,
      newData: { rentCreated, gasCreated },
      note: `Automatic billing up to ${getMonthYearLabel(curMonth, curYear)}: ${rentCreated} rent record(s), ${gasCreated} gas bill(s)`,
    });
  }

  return { rentCreated, gasCreated };
}

/** For page loads: bring charges up to date, but never break the page if it fails. */
export async function ensureMonthlyChargesSafely() {
  try {
    await ensureMonthlyCharges();
  } catch (e) {
    console.error('Automatic billing failed:', e);
  }
}
