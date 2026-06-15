import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Unit from '@/models/Unit';
import { createAuditLog } from '@/lib/audit';
import { createUnitSchema } from '@/lib/validators';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const type = searchParams.get('type');
  const collector = searchParams.get('collector');
  const includeArchived = searchParams.get('includeArchived') === 'true';

  const query: any = {};
  if (!includeArchived) query.status = { $ne: 'archived' };
  if (status) query.status = status;
  if (type) query.unitType = type;
  if (collector) query.assignedCollector = collector;

  const units = await Unit.find(query).sort({ unitType: 1, unitName: 1 }).lean();
  return NextResponse.json({ units });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const body = await req.json();
  const parsed = createUnitSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }

  const username = (session.user as any).username;
  const unit = await Unit.create({
    ...parsed.data,
    createdBy: username,
    updatedBy: username,
  });

  await createAuditLog({
    entityType: 'unit',
    entityId: unit._id.toString(),
    action: 'create',
    performedBy: username,
    newData: parsed.data,
    note: `Created unit: ${unit.unitName}`,
  });

  return NextResponse.json({ unit }, { status: 201 });
}
