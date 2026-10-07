import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Tenant from '@/models/Tenant';
import { createAuditLog } from '@/lib/audit';
import { createTenantSchema } from '@/lib/validators';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const search = searchParams.get('search');
  const includeArchived = searchParams.get('includeArchived') === 'true';

  const query: any = {};
  if (!includeArchived) query.status = { $ne: 'archived' };
  if (status) query.status = status;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { businessName: { $regex: search, $options: 'i' } },
    ];
  }

  const tenants = await Tenant.find(query)
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ tenants });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const body = await req.json();
  const parsed = createTenantSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }

  const username = (session.user as any).username;
  const tenant = await Tenant.create({
    ...parsed.data,
    documents: [],
    createdBy: username,
    updatedBy: username,
  });

  await createAuditLog({
    entityType: 'tenant',
    entityId: tenant._id.toString(),
    action: 'create',
    performedBy: username,
    newData: parsed.data,
    note: `Created tenant: ${tenant.name}`,
  });

  return NextResponse.json({ tenant }, { status: 201 });
}
