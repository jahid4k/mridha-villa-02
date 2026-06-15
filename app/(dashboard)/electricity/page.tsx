import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import ElectricityBill from '@/models/ElectricityBill';
import ElectricitySetting from '@/models/ElectricitySetting';
import Lease from '@/models/Lease';
import Unit from '@/models/Unit';
import { getCurrentMonthYear } from '@/lib/formatters';
import ElectricityClient from '@/components/electricity/ElectricityClient';

export default async function ElectricityPage() {
  const session = await auth();
  await connectDB();
  const { month, year } = getCurrentMonthYear();

  const [bills, settings, leases, units] = await Promise.all([
    ElectricityBill.find({ month, year, status: { $ne: 'archived' } })
      .populate('tenantId', 'name phone')
      .populate('unitId', 'unitName unitNumber electricityMeterNumber')
      .lean(),
    ElectricitySetting.findOne({ month, year }).lean(),
    Lease.find({ status: 'active' })
      .populate('tenantId', 'name')
      .populate('unitIds', 'unitName unitNumber hasElectricitySubMeter electricityMeterNumber')
      .lean(),
    Unit.find({ status: 'occupied', hasElectricitySubMeter: true })
      .select('unitName unitNumber electricityMeterNumber')
      .lean(),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Electricity Bills</h1>
        <p className="text-slate-500 text-sm mt-1">Track sub-meter readings and electricity bills</p>
      </div>
      <ElectricityClient
        initialBills={JSON.parse(JSON.stringify(bills))}
        currentRate={settings?.globalRatePerUnit || 12}
        leases={JSON.parse(JSON.stringify(leases))}
        units={JSON.parse(JSON.stringify(units))}
        defaultMonth={month}
        defaultYear={year}
      />
    </div>
  );
}
