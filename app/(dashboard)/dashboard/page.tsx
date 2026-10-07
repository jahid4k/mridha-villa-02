import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import RentRecord from "@/models/RentRecord";
import Payment from "@/models/Payment";
import Expense from "@/models/Expense";
import Unit from "@/models/Unit";
import ElectricityBill from "@/models/ElectricityBill";
import GasBill from "@/models/GasBill";
import AuditLog from "@/models/AuditLog";
import Lease from "@/models/Lease";
import { getCurrentMonthYear } from "@/lib/formatters";
import { getI18n } from "@/lib/i18n/server";
import { ensureMonthlyChargesSafely } from "@/lib/billing";
import DashboardClient from "@/components/dashboard/DashboardClient";
import { Button } from "@/components/ui/Button";
import { FileSignature } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  await connectDB();
  await ensureMonthlyChargesSafely(); // this month's rent and gas, if not yet charged
  const { month, year } = getCurrentMonthYear();
  const { t, f } = await getI18n();

  const [
    rentRecords,
    recentPayments,
    monthExpenses,
    recentAuditLogs,
    units,
    elecBills,
    gasBills,
    monthlyTrend,
  ] = await Promise.all([
    RentRecord.find({ month, year, status: { $ne: "archived" } })
      .populate("tenantId", "name phone")
      .lean(),
    Payment.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("tenantId", "name")
      .lean(),
    Expense.find({ month, year, status: "active" })
      .sort({ expenseDate: -1 })
      .lean(),
    AuditLog.find().sort({ performedAt: -1 }).limit(6).lean(),
    Unit.find({ status: { $ne: "archived" } }).lean(),
    ElectricityBill.find({ month, year, status: { $ne: "archived" } }).lean(),
    GasBill.find({ month, year, status: { $ne: "archived" } }).lean(),
    RentRecord.aggregate([
      { $match: { status: { $ne: "archived" } } },
      {
        $group: {
          _id: { month: "$month", year: "$year" },
          totalPayable: { $sum: "$totalPayable" },
          totalCollected: { $sum: "$collectedAmount" },
          totalDue: { $sum: "$dueAmount" },
        },
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
      { $limit: 6 },
    ]),
  ]);

  // Build summary
  const totalExpected = rentRecords.reduce(
    (s: number, r: any) => s + r.totalPayable,
    0,
  );
  const totalCollected = rentRecords.reduce(
    (s: number, r: any) => s + r.collectedAmount,
    0,
  );
  const totalDue = rentRecords.reduce(
    (s: number, r: any) => s + r.dueAmount,
    0,
  );
  // Total over every expense this month; only the list below is cut to 5.
  const totalExpenses = monthExpenses.reduce(
    (s: number, e: any) => s + e.amount,
    0,
  );
  const recentExpenses = monthExpenses.slice(0, 5);
  const electricityDue = elecBills.reduce(
    (s: number, b: any) => s + b.dueAmount,
    0,
  );
  const gasDue = gasBills.reduce((s: number, b: any) => s + b.dueAmount, 0);
  const occupiedUnits = units.filter(
    (u: any) => u.status === "occupied",
  ).length;
  const vacantUnits = units.filter((u: any) => u.status === "vacant").length;

  // Get active leases for advance balance
  const activeLeases = await Lease.find({ status: "active" }).lean();
  const totalAdvance = activeLeases.reduce(
    (s: number, l: any) => s + (l.advanceBalance || 0),
    0,
  );

  // Collector split
  const jahidRecords = rentRecords.filter((r: any) => r.collector === "jahid");
  const jonyRecords = rentRecords.filter((r: any) => r.collector === "jony");

  const collectorSummary = {
    jahid: {
      expected: jahidRecords.reduce(
        (s: number, r: any) => s + r.totalPayable,
        0,
      ),
      collected: jahidRecords.reduce(
        (s: number, r: any) => s + r.collectedAmount,
        0,
      ),
      due: jahidRecords.reduce((s: number, r: any) => s + r.dueAmount, 0),
      advance: activeLeases
        .filter((l: any) => l.collector === "jahid")
        .reduce((s: number, l: any) => s + l.advanceBalance, 0),
    },
    jony: {
      expected: jonyRecords.reduce(
        (s: number, r: any) => s + r.totalPayable,
        0,
      ),
      collected: jonyRecords.reduce(
        (s: number, r: any) => s + r.collectedAmount,
        0,
      ),
      due: jonyRecords.reduce((s: number, r: any) => s + r.dueAmount, 0),
      advance: activeLeases
        .filter((l: any) => l.collector === "jony")
        .reduce((s: number, l: any) => s + l.advanceBalance, 0),
    },
  };

  const overdueTenants = rentRecords
    .filter((r: any) => ["unpaid", "partial", "overdue"].includes(r.status))
    .slice(0, 6);

  const data = {
    month,
    year,
    summary: {
      totalExpected,
      totalCollected,
      totalDue,
      totalAdvance,
      totalExpenses,
      electricityDue,
      gasDue,
      totalUnits: units.length,
      occupiedUnits,
      vacantUnits,
    },
    collectorSummary,
    recentPayments,
    recentExpenses,
    recentAuditLogs,
    overdueTenants,
    monthlyTrend: monthlyTrend.reverse(),
  };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t("Dashboard")}</h1>
          <p className="text-slate-500 text-sm mt-1">
            {t('Overview for {month}', { month: f.monthYear(month, year) })}
          </p>
        </div>
        <Link href="/deeds/new">
          <Button leftIcon={<FileSignature className="w-4 h-4" />}>
            {t('New agreement')}
          </Button>
        </Link>
      </div>
      <DashboardClient
        data={JSON.parse(JSON.stringify(data))}
        currentUser={(session?.user as any)?.username || ""}
      />
    </div>
  );
}
