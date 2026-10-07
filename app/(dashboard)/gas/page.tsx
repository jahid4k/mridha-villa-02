import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import GasBill from '@/models/GasBill';
import Lease from '@/models/Lease';
import { getCurrentMonthYear } from '@/lib/formatters';
import { ensureMonthlyChargesSafely } from '@/lib/billing';
import GasClient from '@/components/gas/GasClient';
import { getI18n } from '@/lib/i18n/server';

export default async function GasPage() {
  const session = await auth();
  await connectDB();
  await ensureMonthlyChargesSafely(); // this month's rent and gas, if not yet charged
  const { month, year } = getCurrentMonthYear();
  const { t } = await getI18n();

  const [bills, leases] = await Promise.all([
    GasBill.find({ month, year, status: { $ne: 'archived' } })
      .populate('tenantId', 'name phone')
      .populate('unitIds', 'unitName unitNumber')
      .lean(),
    Lease.find({ status: 'active' })
      .populate('tenantId', 'name phone')
      .populate('unitIds', 'unitName unitNumber')
      .lean(),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">{t('Gas Bills')}</h1>
        <p className="text-slate-500 text-sm mt-1">{t('Track monthly gas charges per tenant')}</p>
      </div>
      <GasClient
        initialBills={JSON.parse(JSON.stringify(bills))}
        leases={JSON.parse(JSON.stringify(leases))}
        defaultMonth={month}
        defaultYear={year}
      />
    </div>
  );
}
