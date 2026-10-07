import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { ensureMonthlyChargesSafely } from '@/lib/billing';
import { tenantAccounts } from '@/lib/collect';

// Every tenant with an active lease or something still owed, with totals.
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  await ensureMonthlyChargesSafely();
  return NextResponse.json({ accounts: await tenantAccounts() });
}
