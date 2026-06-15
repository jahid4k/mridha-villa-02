import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import RentRecord from '@/models/RentRecord';
import Expense from '@/models/Expense';
import Payment from '@/models/Payment';
import { getCurrentMonthYear } from '@/lib/formatters';
import ReportsClient from '@/components/reports/ReportsClient';

export default async function ReportsPage() {
  const session = await auth();
  await connectDB();
  const { year } = getCurrentMonthYear();

  // Pull full-year data for reports
  const [rentRecords, expenses, payments] = await Promise.all([
    RentRecord.find({ year, status: { $ne: 'archived' } })
      .populate('tenantId', 'name')
      .populate('unitIds', 'unitName assignedCollector')
      .lean(),
    Expense.find({ year, status: 'active' }).lean(),
    Payment.find({ createdAt: { $gte: new Date(`${year}-01-01`), $lte: new Date(`${year}-12-31`) } })
      .lean(),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Reports</h1>
        <p className="text-slate-500 text-sm mt-1">Annual summaries, trends, and collector comparisons</p>
      </div>
      <ReportsClient
        rentRecords={JSON.parse(JSON.stringify(rentRecords))}
        expenses={JSON.parse(JSON.stringify(expenses))}
        payments={JSON.parse(JSON.stringify(payments))}
        defaultYear={year}
        currentUser={(session?.user as any)?.username || ''}
      />
    </div>
  );
}
