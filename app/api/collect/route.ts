import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { collectPaymentSchema } from '@/lib/validators';
import { CollectError, recordCollection } from '@/lib/collect';
import { translateError } from '@/lib/i18n';
import { getLang } from '@/lib/i18n/server';

// Money received from a tenant: pays their chosen (or oldest) charges, and
// anything extra is kept as credit for the coming months.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const parsed = collectPaymentSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await recordCollection(
      { ...parsed.data, allowCredit: true },
      (session.user as any).username,
    );
    return NextResponse.json({
      paymentId: result.payment._id,
      receiptNumber: result.payment.receiptNumber,
      allocations: result.allocations,
      creditAdded: result.creditAdded,
    }, { status: 201 });
  } catch (e) {
    if (e instanceof CollectError) {
      return NextResponse.json({ error: translateError(await getLang(), e.message, e.vars) }, { status: e.status });
    }
    throw e;
  }
}
