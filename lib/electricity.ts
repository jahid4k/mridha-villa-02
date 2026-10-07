import ElectricityBill from '@/models/ElectricityBill';
import ElectricitySetting from '@/models/ElectricitySetting';
import Setting from '@/models/Setting';
import Lease from '@/models/Lease';
import Unit from '@/models/Unit';
import { createAuditLog } from '@/lib/audit';
import { billStatus, calculateElectricityBill } from '@/lib/calculations';
import type { ErrorVars } from '@/lib/i18n';

// Server-only electricity billing logic, shared by the page and API routes.

export type RateSource = 'set' | 'carried' | 'default';

export interface ResolvedRate {
  rate: number;
  /** set: saved for this month; carried: from an earlier month; default: Settings page */
  source: RateSource;
  month?: number;
  year?: number;
}

/** message is an English template ('{unit} ...'); routes translate it with vars. */
export class BillError extends Error {
  constructor(message: string, public status = 400, public vars?: ErrorVars) {
    super(message);
  }
}

const beforeMonth = (month: number, year: number) => ({
  $or: [{ year: { $lt: year } }, { year, month: { $lt: month } }],
});

/**
 * The rate for a month: the rate saved for that month, else the most recent
 * earlier month's rate, else the "Default Rate per Unit" from Settings.
 * Null when none of these exist.
 */
export async function resolveElectricityRate(month: number, year: number): Promise<ResolvedRate | null> {
  const own: any = await ElectricitySetting.findOne({ month, year }).lean();
  if (own) return { rate: own.globalRatePerUnit, source: 'set', month, year };

  const earlier: any = await ElectricitySetting.findOne(beforeMonth(month, year))
    .sort({ year: -1, month: -1 })
    .lean();
  if (earlier) {
    return { rate: earlier.globalRatePerUnit, source: 'carried', month: earlier.month, year: earlier.year };
  }

  const fallback: any = await Setting.findOne({ key: 'defaultElectricityRate' }).lean();
  const rate = Number(fallback?.value);
  if (fallback && Number.isFinite(rate) && rate >= 0) return { rate, source: 'default' };

  return null;
}

export interface ReadingInput {
  leaseId: string;
  unitId: string;
  previousReading: number;
  currentReading: number;
  manualAdjustment?: number;
  notes?: string;
}

/**
 * Create one bill after checking the lease owns the unit, the unit has a
 * sub-meter, and the unit has no bill for this month yet.
 */
export async function createElectricityBill(
  input: ReadingInput,
  month: number,
  year: number,
  rate: ResolvedRate,
  username: string,
) {
  const [lease, unit]: any[] = await Promise.all([
    Lease.findById(input.leaseId).lean(),
    Unit.findById(input.unitId).lean(),
  ]);
  if (!lease || lease.status === 'archived') throw new BillError('Lease not found', 404);
  if (!unit) throw new BillError('Unit not found', 404);
  if (!lease.unitIds.some((u: any) => String(u) === input.unitId)) {
    throw new BillError('{unit} is not part of this lease', 400, { unit: unit.unitName });
  }
  if (!unit.hasElectricitySubMeter) {
    throw new BillError('{unit} has no electricity sub-meter', 400, { unit: unit.unitName });
  }

  const duplicate = await ElectricityBill.exists({
    unitId: input.unitId,
    month,
    year,
    status: { $ne: 'archived' },
  });
  if (duplicate) throw new BillError('{unit} already has a bill for this month', 409, { unit: unit.unitName });

  const calc = calculateElectricityBill({
    previousReading: input.previousReading,
    currentReading: input.currentReading,
    globalRatePerUnit: rate.rate,
    manualAdjustment: input.manualAdjustment || 0,
  });
  const { dueAmount, status } = billStatus(calc.finalAmount, 0);

  const bill = await ElectricityBill.create({
    tenantId: lease.tenantId,
    leaseId: input.leaseId,
    unitId: input.unitId,
    month,
    year,
    previousReading: input.previousReading,
    currentReading: input.currentReading,
    consumedUnits: calc.consumedUnits,
    globalRatePerUnit: rate.rate,
    calculatedAmount: calc.calculatedAmount,
    manualAdjustment: calc.manualAdjustment,
    finalAmount: calc.finalAmount,
    paidAmount: 0,
    dueAmount,
    status,
    notes: input.notes,
    createdBy: username,
    updatedBy: username,
  });

  await createAuditLog({
    entityType: 'electricityBill',
    entityId: bill._id.toString(),
    action: 'create',
    performedBy: username,
    newData: {
      month,
      year,
      unit: unit.unitName,
      previousReading: input.previousReading,
      currentReading: input.currentReading,
      consumedUnits: calc.consumedUnits,
      rate: rate.rate,
      manualAdjustment: calc.manualAdjustment,
      finalAmount: calc.finalAmount,
    },
    note: `Created electricity bill for ${unit.unitName}: ${calc.consumedUnits} units @ ৳${rate.rate}/unit = ৳${calc.finalAmount}`,
  });

  return bill;
}

/**
 * Everything the monthly readings sheet needs: one row per metered unit on an
 * active lease (with this month's bill if it exists, otherwise last month's
 * closing reading as the suggested previous reading), plus any other bills
 * for the month, e.g. for a tenant who has since moved out.
 */
export async function buildReadingSheet(month: number, year: number) {
  const [leases, bills, rate]: [any[], any[], ResolvedRate | null] = await Promise.all([
    Lease.find({ status: 'active' })
      .populate('tenantId', 'name phone')
      .populate('unitIds', 'unitName unitNumber hasElectricitySubMeter electricityMeterNumber')
      .lean(),
    ElectricityBill.find({ month, year, status: { $ne: 'archived' } })
      .populate('tenantId', 'name phone')
      .populate('unitId', 'unitName unitNumber electricityMeterNumber')
      .lean(),
    resolveElectricityRate(month, year),
  ]);

  const pairs = leases.flatMap((lease) =>
    (lease.unitIds || [])
      .filter((u: any) => u?.hasElectricitySubMeter)
      .map((unit: any) => ({ lease, unit })),
  );

  const lastReadings: any[] = pairs.length
    ? await ElectricityBill.aggregate([
        {
          $match: {
            unitId: { $in: pairs.map((p) => p.unit._id) },
            status: { $ne: 'archived' },
            ...beforeMonth(month, year),
          },
        },
        { $sort: { year: -1, month: -1 } },
        {
          $group: {
            _id: '$unitId',
            reading: { $first: '$currentReading' },
            month: { $first: '$month' },
            year: { $first: '$year' },
          },
        },
      ])
    : [];
  const lastByUnit = new Map(lastReadings.map((r) => [String(r._id), r]));
  const billByUnit = new Map(bills.map((b) => [String(b.unitId?._id), b]));

  const rows = pairs.map(({ lease, unit }) => {
    const last = lastByUnit.get(String(unit._id));
    const bill = billByUnit.get(String(unit._id)) || null;
    billByUnit.delete(String(unit._id));
    return {
      key: `${lease._id}:${unit._id}`,
      leaseId: lease._id,
      unit: {
        _id: unit._id,
        unitName: unit.unitName,
        unitNumber: unit.unitNumber,
        electricityMeterNumber: unit.electricityMeterNumber,
      },
      tenant: lease.tenantId,
      lastReading: last ? { reading: last.reading, month: last.month, year: last.year } : null,
      bill,
    };
  });

  // Bills whose unit is no longer on an active lease.
  for (const bill of billByUnit.values()) {
    rows.push({
      key: `bill:${bill._id}`,
      leaseId: bill.leaseId,
      unit: bill.unitId,
      tenant: bill.tenantId,
      lastReading: null,
      bill,
    });
  }

  rows.sort((a, b) =>
    String(a.unit?.unitName ?? '').localeCompare(String(b.unit?.unitName ?? ''), undefined, { numeric: true }),
  );

  return JSON.parse(JSON.stringify({ month, year, rate, rows }));
}
