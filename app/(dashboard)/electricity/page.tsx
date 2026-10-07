import { connectDB } from '@/lib/db';
import { buildReadingSheet } from '@/lib/electricity';
import { getCurrentMonthYear } from '@/lib/formatters';
import ElectricityClient from '@/components/electricity/ElectricityClient';
import { getI18n } from '@/lib/i18n/server';

export default async function ElectricityPage() {
  await connectDB();
  const { month, year } = getCurrentMonthYear();
  const sheet = await buildReadingSheet(month, year);
  const { t } = await getI18n();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">{t('Electricity Bills')}</h1>
        <p className="text-slate-500 text-sm mt-1">
          {t("Enter this month's meter readings and create all bills at once")}
        </p>
      </div>
      <ElectricityClient initialSheet={sheet} />
    </div>
  );
}
