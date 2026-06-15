import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Setting from '@/models/Setting';
import { createAuditLog } from '@/lib/audit';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const settings = await Setting.find().lean();

  // Convert to key-value map
  const map: Record<string, any> = {};
  settings.forEach((s) => { map[s.key] = s.value; });

  return NextResponse.json({ settings, map });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const body = await req.json();
  const { key, value } = body;

  if (!key) return NextResponse.json({ error: 'Key is required' }, { status: 400 });

  const username = (session.user as any).username;
  const existing = await Setting.findOne({ key });
  const prevValue = existing?.value;

  const setting = await Setting.findOneAndUpdate(
    { key },
    { value, updatedBy: username },
    { upsert: true, new: true }
  );

  await createAuditLog({
    entityType: 'setting',
    entityId: key,
    action: 'update',
    performedBy: username,
    previousData: { value: prevValue },
    newData: { value },
    note: `Updated setting: ${key}`,
  });

  return NextResponse.json({ setting });
}
