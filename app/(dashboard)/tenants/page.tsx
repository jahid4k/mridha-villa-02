import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Tenant from '@/models/Tenant';
import TenantsClient from '@/components/tenants/TenantsClient';

export default async function TenantsPage() {
  const session = await auth();
  await connectDB();

  const tenants = await Tenant.find({ status: { $ne: 'archived' } })
    .sort({ createdAt: -1 })
    .lean();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Tenants</h1>
        <p className="text-slate-500 text-sm mt-1">Manage tenant profiles and contact information</p>
      </div>
      <TenantsClient
        initialTenants={JSON.parse(JSON.stringify(tenants))}
        currentUser={(session?.user as any)?.username || ''}
      />
    </div>
  );
}
