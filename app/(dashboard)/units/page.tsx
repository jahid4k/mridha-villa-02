import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Unit from '@/models/Unit';
import UnitsClient from '@/components/units/UnitsClient';

export default async function UnitsPage() {
  const session = await auth();
  await connectDB();

  const units = await Unit.find({ status: { $ne: 'archived' } })
    .sort({ unitType: 1, unitName: 1 })
    .lean();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Units</h1>
        <p className="text-slate-500 text-sm mt-1">
          Manage shops, rooms, and other rentable spaces
        </p>
      </div>
      <UnitsClient
        initialUnits={JSON.parse(JSON.stringify(units))}
        currentUser={(session?.user as any)?.username || ''}
      />
    </div>
  );
}
