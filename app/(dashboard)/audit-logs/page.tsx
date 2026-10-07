import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import AuditLog from '@/models/AuditLog';
import AuditLogsClient from '@/components/audit/AuditLogsClient';
import { getI18n } from '@/lib/i18n/server';

export default async function AuditLogsPage() {
  const session = await auth();
  await connectDB();
  const { t } = await getI18n();

  const [logs, total] = await Promise.all([
    AuditLog.find().sort({ performedAt: -1 }).limit(50).lean(),
    AuditLog.countDocuments(),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">{t('Audit Logs')}</h1>
        <p className="text-slate-500 text-sm mt-1">{t('Full activity history — every create, update, and change')}</p>
      </div>
      <AuditLogsClient
        initialLogs={JSON.parse(JSON.stringify(logs))}
        totalLogs={total}
      />
    </div>
  );
}
