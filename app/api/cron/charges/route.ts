import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { ensureMonthlyCharges } from '@/lib/billing';

// Called daily by Vercel Cron (see vercel.json) so the month's rent and gas
// appear on the 1st even if nobody opens the app. Pages also run the same
// check, so this is a backup. Vercel sends "Authorization: Bearer <CRON_SECRET>".
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectDB();
  const result = await ensureMonthlyCharges();
  return NextResponse.json(result);
}
