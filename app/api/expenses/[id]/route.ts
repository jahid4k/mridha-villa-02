import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Expense from '@/models/Expense';
import { createAuditLog, getChangedFields, sanitizeForAudit } from '@/lib/audit';
import { updateExpenseSchema } from '@/lib/validators';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { id } = await params;
  const body = await req.json();
  const parsed = updateExpenseSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await Expense.findById(id);
  if (!existing) return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
  if (existing.status === 'archived') {
    return NextResponse.json({ error: 'Cannot edit archived expense.' }, { status: 400 });
  }

  const username = (session.user as any).username;
  const prevData = sanitizeForAudit(existing.toObject());

  if (parsed.data.expenseDate) {
    parsed.data.expenseDate = new Date(parsed.data.expenseDate) as any;
  }

  Object.assign(existing, parsed.data, { updatedBy: username });
  await existing.save();

  await createAuditLog({
    entityType: 'expense',
    entityId: id,
    action: 'update',
    performedBy: username,
    previousData: prevData,
    newData: sanitizeForAudit(existing.toObject()),
    changedFields: getChangedFields(prevData, sanitizeForAudit(existing.toObject())),
    note: `Updated expense: ${existing.title}`,
  });

  return NextResponse.json({ expense: existing });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { id } = await params;
  const body = await req.json();
  const username = (session.user as any).username;

  const expense = await Expense.findById(id);
  if (!expense) return NextResponse.json({ error: 'Expense not found' }, { status: 404 });

  if (body.action === 'archive') {
    expense.status = 'archived';
    expense.archivedAt = new Date();
    expense.archivedBy = username;
    expense.updatedBy = username;
    await expense.save();

    await createAuditLog({
      entityType: 'expense',
      entityId: id,
      action: 'archive',
      performedBy: username,
      note: `Archived expense: ${expense.title}`,
    });
  } else if (body.action === 'restore') {
    expense.status = 'active';
    expense.archivedAt = undefined;
    expense.archivedBy = undefined;
    expense.updatedBy = username;
    await expense.save();

    await createAuditLog({
      entityType: 'expense',
      entityId: id,
      action: 'restore',
      performedBy: username,
      note: `Restored expense: ${expense.title}`,
    });
  }

  return NextResponse.json({ expense });
}
