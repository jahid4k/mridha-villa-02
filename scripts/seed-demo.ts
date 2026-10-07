import dotenv from 'dotenv';
import fs from 'fs';
import os from 'os';
import path from 'path';

// Replace all tenants, leases, rent, payments, bills, expenses and logs with
// six months of sample data (the current month and the five before it) for
// every unit. Logins, units and Settings are kept.
//
//   npm run seed:demo                       show what would be deleted
//   npm run seed:demo -- --yes              back up, wipe and fill
//   npm run seed:demo -- --yes --backup DIR choose where the backup goes
//
// The data is made with the app's own billing, electricity and collection
// code, so it looks exactly like what the app makes itself. A fixed random
// seed gives the same data on every run.

dotenv.config({ path: path.resolve(__dirname, '../.env.local'), quiet: true });

const args = process.argv.slice(2);
const CONFIRMED = args.includes('--yes');
const backupFlag = args.indexOf('--backup');
const BACKUP_DIR = backupFlag >= 0 && args[backupFlag + 1]
  ? path.resolve(args[backupFlag + 1])
  : path.join(os.tmpdir(), 'mridha-villa-backups');

// Deleted completely. Users, units and settings are kept.
const WIPE = [
  'tenants', 'leases', 'rentrecords', 'payments', 'electricitybills',
  'electricitysettings', 'gasbills', 'expenses', 'auditlogs', 'counters',
];

const MONTH_COUNT = 6;
const RATE_CHANGE_INDEX = 3; // electricity rate goes from ৳12 to ৳13 in the 4th month
const UTILITY_HANDLER = 'jony'; // enters readings and pays the building's bills

type Profile =
  | 'onTime'           // pays everything owed in the first week
  | 'late'             // pays everything owed in the 2nd–3rd week; not yet this month
  | 'behind'           // skips the 4th month, then pays one month's worth: stays a month behind
  | 'skipsElectricity' // pays rent only; pays electricity once, in the 3rd month
  | 'overpays';        // pays two months in the 4th month; the extra becomes credit

type PaymentMethod = 'cash' | 'bank' | 'bkash' | 'nagad';

interface TenantPlan {
  unit: string; // unitNumber
  name: string;
  guardianName: string;
  permanentAddress: string;
  businessName?: string;
  businessType?: string;
  start: string; // lease start, YYYY-MM-DD
  advance: number;
  advancePerMonth?: number; // set: deduct this from rent every month
  profile: Profile;
  method: PaymentMethod;
  paidThisMonth?: boolean; // onTime/skipsElectricity: already paid the current month
}

const PLANS: TenantPlan[] = [
  { unit: 'S1', name: 'Md. Rafiqul Islam', guardianName: 'Md. Abdul Karim', permanentAddress: 'Sreenagar, Munshiganj', businessName: 'Rafiq General Store', businessType: 'Grocery', start: '2023-01-01', advance: 100000, profile: 'onTime', method: 'bank', paidThisMonth: true },
  { unit: 'S2', name: 'Abdul Mannan', guardianName: 'Late Abdur Rahim', permanentAddress: 'Keraniganj, Dhaka', businessName: 'Mannan Pharmacy', businessType: 'Pharmacy', start: '2025-11-01', advance: 30000, advancePerMonth: 2000, profile: 'onTime', method: 'cash', paidThisMonth: true },
  { unit: 'S3', name: 'Shahidul Alam', guardianName: 'Md. Nurul Alam', permanentAddress: 'Lohajang, Munshiganj', businessName: 'Alam Tailors', businessType: 'Tailoring', start: '2023-06-01', advance: 60000, profile: 'onTime', method: 'cash', paidThisMonth: true },
  { unit: 'S4', name: 'Tanvir Ahmed', guardianName: 'Md. Jamal Uddin', permanentAddress: 'Savar, Dhaka', businessName: 'Tanvir Telecom', businessType: 'Mobile & Accessories', start: '2024-03-01', advance: 50000, profile: 'late', method: 'bkash' },
  { unit: 'S5', name: 'Nurul Huda', guardianName: 'Md. Siddiqur Rahman', permanentAddress: 'Tongibari, Munshiganj', businessName: 'Huda Hardware', businessType: 'Hardware', start: '2024-09-01', advance: 50000, profile: 'skipsElectricity', method: 'nagad', paidThisMonth: true },
  { unit: 'S6', name: 'Kamal Hossain', guardianName: 'Md. Delwar Hossain', permanentAddress: 'Nawabganj, Dhaka', businessName: 'Kamal Tea Stall', businessType: 'Tea Stall', start: '2025-01-01', advance: 50000, profile: 'onTime', method: 'cash', paidThisMonth: false },
  { unit: 'S7', name: 'Sumon Mia', guardianName: 'Md. Habibur Rahman', permanentAddress: 'Dohar, Dhaka', businessName: 'Sumon Cosmetics', businessType: 'Cosmetics', start: '2024-01-01', advance: 60000, profile: 'overpays', method: 'cash' },
  { unit: 'R1', name: 'Md. Jashim Uddin', guardianName: 'Md. Kashem Ali', permanentAddress: 'Bhola Sadar, Bhola', start: '2025-02-01', advance: 14000, profile: 'onTime', method: 'cash', paidThisMonth: true },
  { unit: 'R2', name: 'Rubel Hossain', guardianName: 'Md. Mofiz Uddin', permanentAddress: 'Gosairhat, Shariatpur', start: '2025-07-01', advance: 14000, profile: 'behind', method: 'cash' },
  { unit: 'R3', name: 'Nasima Begum', guardianName: 'Md. Anwar Hossain', permanentAddress: 'Madaripur Sadar, Madaripur', start: '2024-05-01', advance: 12000, profile: 'onTime', method: 'cash', paidThisMonth: true },
  { unit: 'R4', name: 'Arif Hasan', guardianName: 'Md. Shamsul Haque', permanentAddress: 'Kishoreganj Sadar, Kishoreganj', start: '2026-01-01', advance: 14000, profile: 'onTime', method: 'bkash', paidThisMonth: true },
  { unit: 'R5', name: 'Monir Hossain', guardianName: 'Md. Abul Kalam', permanentAddress: 'Barishal Sadar, Barishal', start: '2026-03-01', advance: 14000, profile: 'onTime', method: 'cash', paidThisMonth: false },
];

// ---- Helpers ----

function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260507);
const between = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (year: number, month: number, day: number) => `${year}-${pad(month)}-${pad(day)}`;
/** A moment on a Dhaka calendar day, for timestamps. */
const at = (date: string, hour: number, minute = 0) => new Date(`${date}T${pad(hour)}:${pad(minute)}:00+06:00`);
const bdt = (n: number) => `৳${Math.round(n).toLocaleString('en-IN')}`;

async function main() {
  const { connectDB } = await import('@/lib/db');
  const { createRentRecord, ensureMonthlyCharges } = await import('@/lib/billing');
  const { createElectricityBill, resolveElectricityRate } = await import('@/lib/electricity');
  const { openCharges, recordCollection, tenantAccounts } = await import('@/lib/collect');
  const { getCurrentMonthYear, getMonthYearLabel, toYearMonth, todayInDhaka } = await import('@/lib/formatters');
  const { default: Tenant } = await import('@/models/Tenant');
  const { default: Unit } = await import('@/models/Unit');
  const { default: Lease } = await import('@/models/Lease');
  const { default: RentRecord } = await import('@/models/RentRecord');
  const { default: Payment } = await import('@/models/Payment');
  const { default: ElectricityBill } = await import('@/models/ElectricityBill');
  const { default: ElectricitySetting } = await import('@/models/ElectricitySetting');
  const { default: Expense } = await import('@/models/Expense');
  const { default: Setting } = await import('@/models/Setting');
  const { default: AuditLog } = await import('@/models/AuditLog');

  const mongoose = await connectDB();
  const db = mongoose.connection.db!;

  // ---- 1. Show the target and what is in it ----
  console.log(`\nDatabase: ${mongoose.connection.host} / ${mongoose.connection.name}`);
  const collections = (await db.listCollections().toArray()).map((c) => c.name).sort();
  for (const name of collections) {
    const n = await db.collection(name).countDocuments();
    console.log(`  ${name.padEnd(20)} ${String(n).padStart(5)}  ${WIPE.includes(name) ? 'delete' : 'keep'}`);
  }
  if (!CONFIRMED) {
    console.log('\nNothing changed. Run again with --yes to back up, delete and fill.\n');
    await mongoose.disconnect();
    return;
  }

  // ---- 2. Back up every collection ----
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const backup: Record<string, unknown[]> = {};
  for (const name of collections) backup[name] = await db.collection(name).find({}).toArray();
  const backupFile = path.join(BACKUP_DIR, `${mongoose.connection.name}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(backupFile, mongoose.mongo.BSON.EJSON.stringify(backup, undefined, 2, { relaxed: false }));
  console.log(`\nBackup: ${backupFile}`);

  // ---- 3. Wipe ----
  for (const name of WIPE) {
    if (collections.includes(name)) await db.collection(name).deleteMany({});
  }

  const units: any[] = await Unit.find({ status: { $ne: 'archived' } }).lean();
  const unitByNumber = new Map(units.map((u) => [u.unitNumber, u]));
  const missing = PLANS.map((p) => p.unit).filter((n) => !unitByNumber.has(n));
  if (missing.length) throw new Error(`Units not found: ${missing.join(', ')}. Run npm run seed first.`);

  await Unit.collection.updateMany(
    { status: { $ne: 'archived' } },
    { $set: { status: 'vacant' }, $unset: { currentLeaseId: '', currentTenantId: '' } },
  );

  // ---- The months: the current one and the five before it ----
  const today = todayInDhaka();
  const todayDay = Number(today.slice(8, 10));
  const current = getCurrentMonthYear();
  const months = Array.from({ length: MONTH_COUNT }, (_, i) => {
    const d = new Date(Date.UTC(current.year, current.month - 1 - (MONTH_COUNT - 1 - i), 1));
    return { month: d.getUTCMonth() + 1, year: d.getUTCFullYear() };
  });
  const firstYm = toYearMonth(months[0].month, months[0].year);
  const currentYm = toYearMonth(current.month, current.year);
  const LAST = MONTH_COUNT - 1;

  await Setting.updateOne(
    { key: 'billingStartsFrom' },
    {
      $set: { value: firstYm, updatedBy: 'system' },
      $setOnInsert: { label: 'Automatic billing starts from (YYYYMM)' },
    },
    { upsert: true },
  );

  async function stamp(model: any, id: unknown, when: Date) {
    await model.collection.updateOne({ _id: id }, { $set: { createdAt: when, updatedAt: when } });
    await AuditLog.collection.updateMany({ entityId: String(id) }, { $set: { performedAt: when } });
  }

  // ---- 4. Tenants and leases ----
  // Every lease is marked as charged through this month from the start, so the
  // live site's automatic billing has nothing to add while this script runs.
  const leaseByUnit = new Map<string, any>();
  for (const [i, plan] of PLANS.entries()) {
    const unit = unitByNumber.get(plan.unit);
    const owner = unit.assignedCollector;
    const tenant = await Tenant.create({
      name: plan.name,
      phone: `017000000${pad(i + 1)}`,
      nidNumber: `0000000${String(i + 1).padStart(3, '0')}`,
      guardianName: plan.guardianName,
      permanentAddress: plan.permanentAddress,
      businessName: plan.businessName,
      businessType: plan.businessType,
      status: 'active',
      notes: 'Sample data',
      createdBy: owner,
      updatedBy: owner,
    });
    const lease = await Lease.create({
      tenantId: tenant._id,
      unitIds: [unit._id],
      monthlyRentAmount: unit.defaultMonthlyRent,
      startDate: new Date(plan.start),
      rentDueDay: 7,
      securityDepositAmount: 0,
      advanceBalance: plan.advance,
      advanceMode: plan.advancePerMonth ? 'monthly' : 'final',
      advancePerMonth: plan.advancePerMonth ?? 0,
      creditBalance: 0,
      chargedThrough: currentYm,
      collector: owner,
      status: 'active',
      createdBy: owner,
      updatedBy: owner,
    });
    await Unit.updateOne(
      { _id: unit._id },
      { status: 'occupied', currentLeaseId: lease._id, currentTenantId: tenant._id, updatedBy: owner },
    );
    const since = at(plan.start, 11);
    await stamp(Tenant, tenant._id, since);
    await stamp(Lease, lease._id, since);
    leaseByUnit.set(plan.unit, lease);
  }

  // ---- 5. Month by month ----
  const reading = new Map(units.map((u) => [String(u._id), between(1200, 6000)]));
  const used = (unit: any, month: number) => {
    const base = unit.unitType === 'shop' ? between(80, 250) : between(60, 150);
    return Math.round(base * (month >= 4 && month <= 8 ? 1.2 : 1)); // more fans and AC in summer
  };

  for (let i = 0; i < MONTH_COUNT; i++) {
    const { month, year } = months[i];
    const isCurrent = i === LAST;
    const firstDay = ymd(year, month, 1);

    // Electricity rate for this month
    if (i === 0 || i === RATE_CHANGE_INDEX) {
      const rate = i === 0 ? 12 : 13;
      const setting = await ElectricitySetting.create({
        month, year, globalRatePerUnit: rate, createdBy: UTILITY_HANDLER, updatedBy: UTILITY_HANDLER,
      });
      await stamp(ElectricitySetting, setting._id, at(firstDay, 9));
    }

    // Day 1: last month's meter readings
    if (i > 0) {
      const prev = months[i - 1];
      const rate = await resolveElectricityRate(prev.month, prev.year);
      for (const [k, plan] of PLANS.entries()) {
        const unit = unitByNumber.get(plan.unit);
        if (!unit.hasElectricitySubMeter) continue;
        const previousReading = reading.get(String(unit._id))!;
        const currentReading = previousReading + used(unit, prev.month);
        const bill = await createElectricityBill(
          { leaseId: String(leaseByUnit.get(plan.unit)._id), unitId: String(unit._id), previousReading, currentReading },
          prev.month, prev.year, rate!, UTILITY_HANDLER,
        );
        reading.set(String(unit._id), currentReading);
        await stamp(ElectricityBill, bill._id, at(firstDay, 10, k * 3));
      }
    }

    // Day 1: this month's rent. Fresh leases, so advance and credit balances are current.
    const leases: any[] = await Lease.find({ status: 'active' }).lean();
    for (const lease of leases) {
      const record = await createRentRecord(lease, month, year);
      await stamp(RentRecord, record._id, at(firstDay, 0, 5));
    }
    await AuditLog.create({
      entityType: 'rentRecord',
      entityId: `auto-${toYearMonth(month, year)}`,
      action: 'generate',
      performedBy: 'system',
      newData: { rentCreated: leases.length, gasCreated: 0 },
      note: `Automatic billing up to ${getMonthYearLabel(month, year)}: ${leases.length} rent record(s), 0 gas bill(s)`,
      performedAt: at(firstDay, 0, 5),
    });

    // Payments, in date order so receipt numbers follow the calendar
    type Pay = 'all' | 'rentOnly' | 'electricityOnly' | 'oneMonth' | 'double';
    const lastPayDay = isCurrent ? todayDay - 1 : 28;
    const firstWeek = () => between(2, Math.min(7, lastPayDay));
    const planned: { day: number; plan: TenantPlan; pay: Pay }[] = [];
    for (const plan of PLANS) {
      let pay: Pay | null = null;
      let day = firstWeek();
      switch (plan.profile) {
        case 'onTime':
          pay = !isCurrent || plan.paidThisMonth ? 'all' : null;
          break;
        case 'late':
          day = between(12, 20);
          pay = isCurrent ? null : 'all';
          break;
        case 'behind':
          if (i < RATE_CHANGE_INDEX) pay = 'all';
          else if (i === RATE_CHANGE_INDEX || isCurrent) pay = null;
          else { pay = 'oneMonth'; day = between(5, 9); }
          break;
        case 'skipsElectricity':
          pay = i === 2 ? 'all' : !isCurrent || plan.paidThisMonth ? 'rentOnly' : null;
          break;
        case 'overpays':
          pay = isCurrent ? null : i === RATE_CHANGE_INDEX ? 'double' : i === RATE_CHANGE_INDEX + 1 ? 'electricityOnly' : 'all';
          break;
      }
      if (pay && day >= 2 && day <= lastPayDay) planned.push({ day, plan, pay });
    }
    planned.sort((a, b) => a.day - b.day);

    for (const [k, { day, plan, pay }] of planned.entries()) {
      const lease = leaseByUnit.get(plan.unit);
      const tenantId = String(lease.tenantId);
      const open = await openCharges(tenantId);
      const sum = (cs: typeof open) => cs.reduce((s, c) => s + c.due, 0);
      const rent = open.filter((c) => c.kind === 'rent');
      const electricity = open.filter((c) => c.kind === 'electricity');

      let amount = 0;
      let targets: { kind: 'rent' | 'electricity' | 'gas'; id: string }[] | undefined;
      let allowCredit = false;
      if (pay === 'all') amount = sum(open);
      if (pay === 'rentOnly') { targets = rent; amount = sum(rent); }
      if (pay === 'electricityOnly') { targets = electricity; amount = sum(electricity); }
      if (pay === 'oneMonth') {
        const lastBill = electricity[electricity.length - 1];
        amount = Math.min(sum(open), lease.monthlyRentAmount + (lastBill?.total ?? 0));
      }
      if (pay === 'double') { amount = sum(open) + lease.monthlyRentAmount; allowCredit = true; }
      if (amount <= 0) continue;

      const owner = lease.collector;
      const receivedBy = rand() < 0.1 ? (owner === 'jahid' ? 'jony' : 'jahid') : owner;
      const date = ymd(year, month, day);
      const { payment } = await recordCollection(
        {
          tenantId,
          amount,
          paymentDate: date,
          paymentMethod: plan.method,
          receivedBy,
          targets: targets?.map((c) => ({ kind: c.kind, id: c.id })),
          allowCredit,
        },
        receivedBy,
      );
      await stamp(Payment, payment._id, at(date, 10 + (k % 9), between(0, 59)));
    }

    // Expenses on the 5th, plus a few one-offs
    const expenses: any[] = [];
    if (!isCurrent || todayDay >= 5) {
      const fifth = ymd(year, month, 5);
      expenses.push(
        { date: fifth, title: 'Guard salary', category: 'staff', amount: 8000, paidBy: 'joint', expenseTreatment: 'shared50_50' },
        { date: fifth, title: 'Cleaner', category: 'cleaner', amount: 2500, paidBy: 'jony', expenseTreatment: 'shared50_50' },
        { date: fifth, title: 'Building electricity (common meter)', category: 'common_electricity', amount: between(180, 240) * 10, paidBy: 'jony', expenseTreatment: 'shared50_50' },
        { date: fifth, title: 'Water bill', category: 'water', amount: 600, paidBy: 'jony', expenseTreatment: 'shared50_50' },
      );
    }
    if (i === 1) expenses.push({ date: ymd(year, month, 18), title: 'Shutter repair, Shop 2', category: 'repair', amount: 3500, paidBy: 'jony', expenseTreatment: 'brotherMaintained', relatedUnitId: unitByNumber.get('S2')._id });
    if (i === RATE_CHANGE_INDEX) expenses.push({ date: ymd(year, month, 22), title: 'Roof waterproofing', category: 'renovation', amount: 18000, paidBy: 'joint', expenseTreatment: 'shared50_50' });
    if (i === RATE_CHANGE_INDEX + 1) expenses.push({ date: ymd(year, month, 15), title: 'Holding tax (half year)', category: 'tax', amount: 12000, paidBy: 'jahid', expenseTreatment: 'custom', customShare: { jahid: 7000, jony: 5000 } });

    for (const e of expenses) {
      const by = e.paidBy === 'joint' ? 'jahid' : e.paidBy;
      const { date, ...fields } = e;
      const expense = await Expense.create({
        ...fields,
        expenseDate: new Date(date),
        month,
        year,
        status: 'active',
        createdBy: by,
        updatedBy: by,
      });
      await AuditLog.create({
        entityType: 'expense',
        entityId: expense._id.toString(),
        action: 'create',
        performedBy: by,
        newData: { title: e.title, amount: e.amount, category: e.category, paidBy: e.paidBy },
        note: `Created expense: ${e.title} ৳${e.amount}`,
      });
      await stamp(Expense, expense._id, at(date, 19));
    }

    console.log(`  ${getMonthYearLabel(month, year)}: ${leases.length} rent, ${planned.length} payment(s), ${expenses.length} expense(s)`);
  }

  await AuditLog.create({
    entityType: 'setting',
    entityId: 'sample-data',
    action: 'create',
    performedBy: 'system',
    note: `Loaded sample data: ${getMonthYearLabel(months[0].month, months[0].year)} to ${getMonthYearLabel(current.month, current.year)}`,
  });

  // ---- 6. Summary ----
  const again = await ensureMonthlyCharges();
  const [rentRecords, payments, bills, expenseCount]: any[] = await Promise.all([
    RentRecord.find({}).lean(),
    Payment.find({}).sort({ receiptNumber: 1 }).lean(),
    ElectricityBill.countDocuments(),
    Expense.countDocuments(),
  ]);
  const accounts = (await tenantAccounts()).filter((a: any) => a.due > 0 || a.credit > 0);

  console.log(`\nDone. ${PLANS.length} tenants, ${PLANS.length} leases, ${rentRecords.length} rent records, ${bills} electricity bills, ${payments.length} payments (${payments[0]?.receiptNumber} to ${payments[payments.length - 1]?.receiptNumber}), ${expenseCount} expenses.`);
  console.log(`Rent billed ${bdt(rentRecords.reduce((s: number, r: any) => s + r.totalPayable, 0))}, money collected ${bdt(payments.reduce((s: number, p: any) => s + p.amount, 0))}.`);
  console.log(`Automatic billing check: ${again.rentCreated} rent and ${again.gasCreated} gas records still to add (should be 0).`);
  console.log('\nWho owes (as of today):');
  for (const a of accounts) {
    const extras = [a.lateDue > 0 ? `${bdt(a.lateDue)} late` : '', a.credit > 0 ? `${bdt(a.credit)} credit` : ''].filter(Boolean).join(', ');
    console.log(`  ${a.name.padEnd(20)} ${a.units.join(', ').padEnd(8)} ${bdt(a.due).padStart(9)}${extras ? `  (${extras})` : ''}`);
  }
  console.log('');

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error('❌ Sample data failed:', error);
  process.exit(1);
});
