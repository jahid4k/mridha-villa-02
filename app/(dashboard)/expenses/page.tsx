import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Expense from '@/models/Expense';
import Unit from '@/models/Unit';
import { getCurrentMonthYear } from '@/lib/formatters';
import ExpensesClient from '@/components/expenses/ExpensesClient';

export default async function ExpensesPage() {
  const session = await auth();
  await connectDB();
  const { month, year } = getCurrentMonthYear();

  const [expenses, units] = await Promise.all([
    Expense.find({ month, year, status: 'active' })
      .populate('relatedUnitId', 'unitName unitNumber')
      .sort({ expenseDate: -1 })
      .lean(),
    Unit.find({ status: { $ne: 'archived' } }).select('unitName unitNumber').lean(),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Expenses</h1>
        <p className="text-slate-500 text-sm mt-1">Track building maintenance and operational expenses</p>
      </div>
      <ExpensesClient
        initialExpenses={JSON.parse(JSON.stringify(expenses))}
        units={JSON.parse(JSON.stringify(units))}
        defaultMonth={month}
        defaultYear={year}
        currentUser={(session?.user as any)?.username || ''}
      />
    </div>
  );
}
