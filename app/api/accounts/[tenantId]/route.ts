import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import Lease from '@/models/Lease';
import { openCharges } from '@/lib/collect';

// One tenant's unpaid charges (oldest first) and the balances held on their lease.
export async function GET(req: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { tenantId } = await params;
  const [charges, leases]: [any[], any[]] = await Promise.all([
    openCharges(tenantId),
    Lease.find({ tenantId, status: 'active' }).select('creditBalance advanceBalance').lean(),
  ]);

  return NextResponse.json({
    charges,
    credit: leases.reduce((s, l) => s + (l.creditBalance || 0), 0),
    advance: leases.reduce((s, l) => s + (l.advanceBalance || 0), 0),
  });
}
