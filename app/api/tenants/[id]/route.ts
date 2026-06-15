import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Tenant from '@/models/Tenant';
import { createAuditLog, getChangedFields, sanitizeForAudit } from '@/lib/audit';
import { updateTenantSchema } from '@/lib/validators';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { id } = await params;
  const tenant = await Tenant.findById(id)
    .populate('activeLeaseIds')
    .lean();
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

  return NextResponse.json({ tenant });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { id } = await params;
  const body = await req.json();
  const parsed = updateTenantSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await Tenant.findById(id);
  if (!existing) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  if (existing.status === 'archived') {
    return NextResponse.json({ error: 'Cannot edit archived tenant. Restore first.' }, { status: 400 });
  }

  const username = (session.user as any).username;
  const prevData = sanitizeForAudit(existing.toObject());

  Object.assign(existing, parsed.data, { updatedBy: username });
  await existing.save();

  const newData = sanitizeForAudit(existing.toObject());

  await createAuditLog({
    entityType: 'tenant',
    entityId: id,
    action: 'update',
    performedBy: username,
    previousData: prevData,
    newData: newData,
    changedFields: getChangedFields(prevData, newData),
    note: `Updated tenant: ${existing.name}`,
  });

  return NextResponse.json({ tenant: existing });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { id } = await params;
  const body = await req.json();
  const username = (session.user as any).username;

  const tenant = await Tenant.findById(id);
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

  if (body.action === 'archive') {
    tenant.status = 'archived';
    tenant.archivedAt = new Date();
    tenant.archivedBy = username;
    tenant.updatedBy = username;
    await tenant.save();

    await createAuditLog({
      entityType: 'tenant',
      entityId: id,
      action: 'archive',
      performedBy: username,
      note: `Archived tenant: ${tenant.name}`,
    });
  } else if (body.action === 'restore') {
    tenant.status = 'active';
    tenant.archivedAt = undefined;
    tenant.archivedBy = undefined;
    tenant.updatedBy = username;
    await tenant.save();

    await createAuditLog({
      entityType: 'tenant',
      entityId: id,
      action: 'restore',
      performedBy: username,
      note: `Restored tenant: ${tenant.name}`,
    });
  } else if (body.action === 'addDocument') {
    tenant.documents.push(body.document);
    tenant.updatedBy = username;
    await tenant.save();

    await createAuditLog({
      entityType: 'tenant',
      entityId: id,
      action: 'update',
      performedBy: username,
      note: `Added document to tenant: ${tenant.name}`,
    });
  }

  return NextResponse.json({ tenant });
}
