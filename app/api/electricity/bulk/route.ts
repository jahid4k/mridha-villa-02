import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { bulkElectricityBillSchema } from '@/lib/validators';
import { BillError, createElectricityBill, resolveElectricityRate } from '@/lib/electricity';
import { translateError } from '@/lib/i18n';
import { getLang } from '@/lib/i18n/server';

// Create this month's bills for many units at once (the readings sheet).
// Each entry succeeds or fails on its own; failures are reported per unit.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const parsed = bulkElectricityBillSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }

  const username = (session.user as any).username;
  const { month, year, entries } = parsed.data;

  const rate = await resolveElectricityRate(month, year);
  if (!rate) {
    return NextResponse.json({ error: 'Set an electricity rate first' }, { status: 400 });
  }

  const lang = await getLang();
  let created = 0;
  const errors: { unitId: string; error: string }[] = [];
  for (const entry of entries) {
    try {
      await createElectricityBill(entry, month, year, rate, username);
      created++;
    } catch (e) {
      if (!(e instanceof BillError)) console.error('Electricity bulk create failed:', e);
      errors.push({
        unitId: entry.unitId,
        error: e instanceof BillError ? translateError(lang, e.message, e.vars) : translateError(lang, 'Could not create bill'),
      });
    }
  }

  return NextResponse.json({ created, errors }, { status: created > 0 ? 201 : 400 });
}
