import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import RentRecord from '@/models/RentRecord';
import { getCurrentMonthYear } from '@/lib/formatters';
import { ensureMonthlyChargesSafely } from '@/lib/billing';
import { tenantAccounts } from '@/lib/collect';
import RentClient from '@/components/rent/RentClient';
import { getI18n } from '@/lib/i18n/server';

export default async function RentPage() {
  const session = await auth();
  await connectDB();
  await ensureMonthlyChargesSafely(); // this month's rent and gas, if not yet charged

  const { month, year } = getCurrentMonthYear();
  const { t } = await getI18n();

  const [records, accounts] = await Promise.all([
    RentRecord.find({ month, year, status: { $ne: 'archived' } })
      .populate('tenantId', 'name phone')
      .populate('leaseId', 'monthlyRentAmount advanceBalance collector rentDueDay')
      .populate('unitIds', 'unitName unitNumber')
      .sort({ createdAt: -1 })
      .lean(),
    tenantAccounts(),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">{t('Rent Collection')}</h1>
        <p className="text-slate-500 text-sm mt-1">
          {t('Rent and gas are charged automatically every month. Tap Collect when a tenant pays.')}
        </p>
      </div>
      <RentClient
        initialRecords={JSON.parse(JSON.stringify(records))}
        initialAccounts={JSON.parse(JSON.stringify(accounts))}
        defaultMonth={month}
        defaultYear={year}
        currentUser={(session?.user as any)?.username || ''}
      />
    </div>
  );
}
