import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Setting from '@/models/Setting';
import SettingsClient from '@/components/settings/SettingsClient';

export default async function SettingsPage() {
  const session = await auth();
  await connectDB();

  const settings = await Setting.find().lean();
  const map: Record<string, any> = {};
  settings.forEach((s) => { map[s.key] = s.value; });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Configure building and system preferences</p>
      </div>
      <SettingsClient
        initialSettings={map}
        currentUser={(session?.user as any)?.username || ''}
      />
    </div>
  );
}
