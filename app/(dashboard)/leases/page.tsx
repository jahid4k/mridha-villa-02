import { connectDB } from '@/lib/db';
import Lease from '@/models/Lease';
import Tenant from '@/models/Tenant';
import Unit from '@/models/Unit';
import LeasesClient from '@/components/leases/LeasesClient';
import { getI18n } from '@/lib/i18n/server';

export default async function LeasesPage() {
  await connectDB();
  const { t } = await getI18n();

  const [leases, tenants, units] = await Promise.all([
    Lease.find({ status: { $ne: 'archived' } })
      .populate('tenantId', 'name phone')
      .populate('unitIds', 'unitName unitNumber unitType assignedCollector')
      .sort({ createdAt: -1 })
      .lean(),
    Tenant.find({ status: 'active' }).select('name phone businessName').lean(),
    Unit.find({ status: { $ne: 'archived' } }).select('unitName unitNumber unitType assignedCollector status').lean(),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">{t('Leases')}</h1>
        <p className="text-slate-500 text-sm mt-1">{t('Manage rent agreements and lease contracts')}</p>
      </div>
      <LeasesClient
        initialLeases={JSON.parse(JSON.stringify(leases))}
        tenants={JSON.parse(JSON.stringify(tenants))}
        units={JSON.parse(JSON.stringify(units))}
      />
    </div>
  );
}
