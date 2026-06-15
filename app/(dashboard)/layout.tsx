import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import DashboardShell from '@/components/shared/DashboardShell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const username = (session.user as any).username || 'admin';

  return (
    <DashboardShell username={username}>
      {children}
    </DashboardShell>
  );
}
