import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Expense from '@/models/Expense';
import { createAuditLog } from '@/lib/audit';
import { createExpenseSchema } from '@/lib/validators';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month');
  const year = searchParams.get('year');
  const category = searchParams.get('category');
  const paidBy = searchParams.get('paidBy');
  const includeArchived = searchParams.get('includeArchived') === 'true';

  const query: any = {};
  if (!includeArchived) query.status = 'active';
  if (month) query.month = Number(month);
  if (year) query.year = Number(year);
  if (category) query.category = category;
  if (paidBy) query.paidBy = paidBy;

  const expenses = await Expense.find(query)
    .populate('relatedUnitId', 'unitName unitNumber')
    .sort({ expenseDate: -1 })
    .lean();

  return NextResponse.json({ expenses });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const body = await req.json();
  const parsed = createExpenseSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }

  const username = (session.user as any).username;
  const expense = await Expense.create({
    ...parsed.data,
    expenseDate: new Date(parsed.data.expenseDate),
    status: 'active',
    createdBy: username,
    updatedBy: username,
  });

  await createAuditLog({
    entityType: 'expense',
    entityId: expense._id.toString(),
    action: 'create',
    performedBy: username,
    newData: parsed.data,
    note: `Created expense: ${expense.title} ৳${expense.amount}`,
  });

  return NextResponse.json({ expense }, { status: 201 });
}
