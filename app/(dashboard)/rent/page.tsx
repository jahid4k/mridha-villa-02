import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import RentRecord from '@/models/RentRecord';
import Lease from '@/models/Lease';
import { getCurrentMonthYear } from '@/lib/formatters';
import RentClient from '@/components/rent/RentClient';

export default async function RentPage() {
  const session = await auth();
  await connectDB();

  const { month, year } = getCurrentMonthYear();

  const [records, activeLeases] = await Promise.all([
    RentRecord.find({ month, year, status: { $ne: 'archived' } })
      .populate('tenantId', 'name phone')
      .populate('leaseId', 'monthlyRentAmount advanceBalance collector')
      .populate('unitIds', 'unitName unitNumber')
      .sort({ createdAt: -1 })
      .lean(),
    Lease.find({ status: 'active' })
      .populate('tenantId', 'name phone')
      .populate('unitIds', 'unitName unitNumber')
      .lean(),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Rent Collection</h1>
        <p className="text-slate-500 text-sm mt-1">Generate and track monthly rent records</p>
      </div>
      <RentClient
        initialRecords={JSON.parse(JSON.stringify(records))}
        activeLeases={JSON.parse(JSON.stringify(activeLeases))}
        defaultMonth={month}
        defaultYear={year}
        currentUser={(session?.user as any)?.username || ''}
      />
    </div>
  );
}
