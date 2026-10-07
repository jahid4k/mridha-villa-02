import RentRecord from '@/models/RentRecord';
import ElectricityBill from '@/models/ElectricityBill';
import GasBill from '@/models/GasBill';
import Lease from '@/models/Lease';
import Payment, { type ChargeKind } from '@/models/Payment';
import Tenant from '@/models/Tenant';
import { nextReceiptNumber } from '@/models/Counter';
import { createAuditLog } from '@/lib/audit';
import { billStatus, calculateRent, isRentLate } from '@/lib/calculations';
import { formatBDT, getMonthName, todayInDhaka } from '@/lib/formatters';
import type { ErrorVars } from '@/lib/i18n';

// A tenant's account (server-only): everything they still owe across rent,
// electricity and gas, and recording money received against it.
// Each charge keeps its own paid/due amounts; nothing is copied between months.

export type { ChargeKind };

export interface OpenCharge {
  kind: ChargeKind;
  id: string;
  tenantId: string;
  leaseId: string;
  month: number;
  year: number;
  units: string;
  total: number;
  paid: number;
  due: number;
  /** Rent only: today is past the lease's due day for that month. */
  late: boolean;
}

/** message is an English template; routes translate it with vars. */
export class CollectError extends Error {
  constructor(message: string, public status = 400, public vars?: ErrorVars) {
    super(message);
  }
}

const KIND_ORDER: Record<ChargeKind, number> = { rent: 0, electricity: 1, gas: 2 };
const round2 = (n: number) => Math.round(n * 100) / 100;

const id = (v: any) => String(v?._id ?? v);

/** Unpaid charges, oldest first (rent before utilities within a month). */
export async function openCharges(tenantId?: string): Promise<OpenCharge[]> {
  const byTenant = tenantId ? { tenantId } : {};
  const [rent, electricity, gas]: any[][] = await Promise.all([
    RentRecord.find({ ...byTenant, status: { $ne: 'archived' }, dueAmount: { $gt: 0 } })
      .populate('leaseId', 'rentDueDay')
      .populate('unitIds', 'unitName')
      .lean(),
    ElectricityBill.find({ ...byTenant, status: { $in: ['unpaid', 'partial'] } })
      .populate('unitId', 'unitName')
      .lean(),
    GasBill.find({ ...byTenant, status: { $in: ['unpaid', 'partial'] } })
      .populate('unitIds', 'unitName')
      .lean(),
  ]);
  const today = todayInDhaka();

  const charges: OpenCharge[] = [
    ...rent.map((r) => ({
      kind: 'rent' as const,
      id: id(r._id),
      tenantId: id(r.tenantId),
      leaseId: id(r.leaseId),
      month: r.month,
      year: r.year,
      units: (r.unitIds || []).map((u: any) => u?.unitName).filter(Boolean).join(', '),
      total: r.totalPayable,
      paid: r.collectedAmount,
      due: r.dueAmount,
      late: isRentLate(r.month, r.year, r.leaseId?.rentDueDay, today),
    })),
    ...electricity.map((b) => ({
      kind: 'electricity' as const,
      id: id(b._id),
      tenantId: id(b.tenantId),
      leaseId: id(b.leaseId),
      month: b.month,
      year: b.year,
      units: b.unitId?.unitName ?? '',
      total: b.finalAmount,
      paid: b.paidAmount,
      due: b.dueAmount,
      late: false,
    })),
    ...gas.map((b) => ({
      kind: 'gas' as const,
      id: id(b._id),
      tenantId: id(b.tenantId),
      leaseId: id(b.leaseId),
      month: b.month,
      year: b.year,
      units: (b.unitIds || []).map((u: any) => u?.unitName).filter(Boolean).join(', '),
      total: b.amount,
      paid: b.paidAmount,
      due: b.dueAmount,
      late: false,
    })),
  ];

  return charges.sort(
    (a, b) => a.year - b.year || a.month - b.month || KIND_ORDER[a.kind] - KIND_ORDER[b.kind],
  );
}

/** Every tenant who owes something or has an active lease, with their totals. */
export async function tenantAccounts() {
  const [charges, leases]: [OpenCharge[], any[]] = await Promise.all([
    openCharges(),
    Lease.find({ status: 'active' })
      .populate('tenantId', 'name phone')
      .populate('unitIds', 'unitName')
      .lean(),
  ]);

  const accounts = new Map<string, any>();
  const account = (tenantId: string) => {
    if (!accounts.has(tenantId)) {
      accounts.set(tenantId, {
        tenantId,
        name: '',
        phone: '',
        units: [] as string[],
        collectors: [] as string[],
        due: 0,
        lateDue: 0,
        openCount: 0,
        credit: 0,
        advance: 0,
        hasActiveLease: false,
      });
    }
    return accounts.get(tenantId);
  };

  for (const lease of leases) {
    const a = account(id(lease.tenantId));
    a.name = lease.tenantId?.name ?? a.name;
    a.phone = lease.tenantId?.phone ?? a.phone;
    a.units.push(...(lease.unitIds || []).map((u: any) => u?.unitName).filter(Boolean));
    if (!a.collectors.includes(lease.collector)) a.collectors.push(lease.collector);
    a.credit = round2(a.credit + (lease.creditBalance || 0));
    a.advance = round2(a.advance + (lease.advanceBalance || 0));
    a.hasActiveLease = true;
  }

  for (const c of charges) {
    const a = account(c.tenantId);
    a.due = round2(a.due + c.due);
    if (c.late) a.lateDue = round2(a.lateDue + c.due);
    a.openCount++;
  }

  // Former tenants who still owe: look up their names.
  const missing = [...accounts.values()].filter((a) => !a.name).map((a) => a.tenantId);
  if (missing.length) {
    const tenants: any[] = await Tenant.find({ _id: { $in: missing } }).select('name phone').lean();
    for (const t of tenants) {
      const a = accounts.get(id(t._id));
      a.name = t.name;
      a.phone = t.phone;
    }
  }

  return [...accounts.values()].sort((a, b) => b.due - a.due || a.name.localeCompare(b.name));
}

export interface CollectInput {
  tenantId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  receivedBy: string;
  notes?: string;
  /** Pay these charges, in this order. Omitted: oldest first. Empty: none (all becomes credit). */
  targets?: { kind: ChargeKind; id: string }[];
  /** Keep money beyond what's owed as credit (otherwise it's an error). */
  allowCredit: boolean;
}

/**
 * Record money received from a tenant: pay the chosen (or oldest) charges,
 * keep anything extra as credit, and save one Payment with a receipt number.
 */
export async function recordCollection(input: CollectInput, username: string) {
  const all = await openCharges(input.tenantId);

  let charges = all;
  if (input.targets) {
    charges = input.targets.map((t) => {
      const charge = all.find((c) => c.kind === t.kind && c.id === t.id);
      if (!charge) throw new CollectError('That bill is already paid or no longer exists', 409);
      return charge;
    });
  }

  let remaining = round2(input.amount);
  const allocations: (OpenCharge & { amount: number })[] = [];
  for (const charge of charges) {
    if (remaining <= 0) break;
    const amount = round2(Math.min(remaining, charge.due));
    allocations.push({ ...charge, amount });
    remaining = round2(remaining - amount);
  }

  if (remaining > 0 && !input.allowCredit) {
    const owed = round2(charges.reduce((s, c) => s + c.due, 0));
    throw new CollectError('Amount is more than the due ({amount})', 400, { amount: { bdt: owed } });
  }

  // Extra money is kept on the tenant's current lease.
  const activeLease: any = await Lease.findOne({ tenantId: input.tenantId, status: 'active' })
    .sort({ startDate: -1 })
    .lean();
  const leaseId = allocations[0]?.leaseId ?? (activeLease ? id(activeLease._id) : null);
  if (!leaseId) throw new CollectError('This tenant owes nothing and has no active lease');
  const creditLeaseId = activeLease ? id(activeLease._id) : leaseId;

  const paidAt = new Date(input.paymentDate);
  const receiptNumber = await nextReceiptNumber(Number(input.paymentDate.slice(0, 4)));
  const rentAllocations = allocations.filter((a) => a.kind === 'rent');

  const payment = await Payment.create({
    tenantId: input.tenantId,
    leaseId,
    monthlyRentRecordId: rentAllocations.length === 1 ? rentAllocations[0].id : undefined,
    allocations: allocations.map((a) => ({
      kind: a.kind,
      refId: a.id,
      month: a.month,
      year: a.year,
      amount: a.amount,
    })),
    creditAdded: remaining,
    amount: round2(input.amount),
    paymentDate: paidAt,
    paymentMethod: input.paymentMethod,
    receivedBy: input.receivedBy,
    paymentType: allocations.length > 0 ? 'collection' : 'advance',
    notes: input.notes,
    receiptNumber,
    attachments: [],
    createdBy: username,
    updatedBy: username,
  });

  for (const a of allocations) {
    await applyToCharge(a.kind, a.id, a.amount, payment._id, paidAt, input.receivedBy, username);
  }
  if (remaining > 0) {
    await Lease.updateOne({ _id: creditLeaseId }, { $inc: { creditBalance: remaining } });
  }

  const summary = allocations
    .map((a) => `${a.kind} ${getMonthName(a.month).slice(0, 3)} ${a.year} ${formatBDT(a.amount)}`)
    .join(', ');
  await createAuditLog({
    entityType: 'payment',
    entityId: payment._id.toString(),
    action: 'payment',
    performedBy: username,
    newData: {
      receiptNumber,
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      receivedBy: input.receivedBy,
      allocations: allocations.map((a) => ({ kind: a.kind, id: a.id, amount: a.amount })),
      creditAdded: remaining,
    },
    note: `Received ${formatBDT(input.amount)} (${receiptNumber})` +
      (summary ? `: ${summary}` : '') +
      (remaining > 0 ? `; ${formatBDT(remaining)} kept as credit` : ''),
  });

  return { payment, allocations, creditAdded: remaining };
}

async function applyToCharge(
  kind: ChargeKind,
  chargeId: string,
  amount: number,
  paymentId: any,
  paidAt: Date,
  receivedBy: string,
  username: string,
) {
  if (kind === 'rent') {
    const record = await RentRecord.findById(chargeId);
    record.collectedAmount = round2(record.collectedAmount + amount);
    record.paymentIds.push(paymentId);
    const calc = calculateRent({
      baseRent: record.baseRent,
      previousDue: record.previousDue,
      extraCharges: record.extraCharges,
      discount: record.discount,
      advanceAdjustment: record.advanceAdjustment,
      collectedAmount: record.collectedAmount,
    });
    record.dueAmount = calc.dueAmount;
    record.advanceCreated = calc.advanceCreated;
    record.status = calc.status;
    record.updatedBy = username;
    await record.save();
    return;
  }

  const bill = kind === 'electricity'
    ? await ElectricityBill.findById(chargeId)
    : await GasBill.findById(chargeId);
  const total = kind === 'electricity' ? bill.finalAmount : bill.amount;
  bill.paidAmount = round2(bill.paidAmount + amount);
  const { dueAmount, status } = billStatus(total, bill.paidAmount);
  bill.dueAmount = dueAmount;
  bill.status = status;
  bill.paymentDate = paidAt;
  if (kind === 'electricity') bill.payments.push({ amount, paidAt, receivedBy });
  bill.updatedBy = username;
  await bill.save();
}
