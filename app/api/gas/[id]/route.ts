import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import GasBill from '@/models/GasBill';
import { createAuditLog } from '@/lib/audit';
import { payBillSchema } from '@/lib/validators';
import { CollectError, recordCollection } from '@/lib/collect';
import { translateError } from '@/lib/i18n';
import { getLang } from '@/lib/i18n/server';
import { todayInDhaka } from '@/lib/formatters';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { id } = await params;
  const parsed = payBillSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }
  const username = (session.user as any).username;
  const { amount, paymentDate, notes } = parsed.data;

  const bill = await GasBill.findById(id);
  if (!bill) return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
  if (bill.status === 'archived') {
    return NextResponse.json({ error: 'This bill is archived' }, { status: 400 });
  }
  if (bill.dueAmount <= 0) {
    return NextResponse.json({ error: 'This bill is already fully paid' }, { status: 400 });
  }
  if (amount > bill.dueAmount) {
    return NextResponse.json(
      { error: translateError(await getLang(), 'Amount is more than the due ({amount})', { amount: { bdt: bill.dueAmount } }) },
      { status: 400 },
    );
  }

  // Same path as the Collect screen: one Payment with a receipt, added on top
  // of what was already paid.
  try {
    await recordCollection({
      tenantId: String(bill.tenantId),
      amount,
      paymentDate: paymentDate || todayInDhaka(),
      paymentMethod: 'cash',
      receivedBy: username,
      notes,
      targets: [{ kind: 'gas', id }],
      allowCredit: false,
    }, username);
  } catch (e) {
    if (e instanceof CollectError) {
      return NextResponse.json({ error: translateError(await getLang(), e.message, e.vars) }, { status: e.status });
    }
    throw e;
  }

  return NextResponse.json({ bill: await GasBill.findById(id).lean() });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { id } = await params;
  const body = await req.json();
  const username = (session.user as any).username;

  const bill = await GasBill.findById(id);
  if (!bill) return NextResponse.json({ error: 'Bill not found' }, { status: 404 });

  if (body.action === 'archive') {
    bill.status = 'archived';
    bill.archivedAt = new Date();
    bill.archivedBy = username;
    bill.updatedBy = username;
    await bill.save();

    await createAuditLog({
      entityType: 'gasBill',
      entityId: id,
      action: 'archive',
      performedBy: username,
      note: `Archived gas bill`,
    });
  }

  return NextResponse.json({ bill });
}
