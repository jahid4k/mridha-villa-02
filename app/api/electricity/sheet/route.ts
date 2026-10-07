import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { buildReadingSheet } from '@/lib/electricity';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const { searchParams } = new URL(req.url);
  const month = Number(searchParams.get('month'));
  const year = Number(searchParams.get('year'));
  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 2020) {
    return NextResponse.json({ error: 'Invalid month or year' }, { status: 400 });
  }

  return NextResponse.json(await buildReadingSheet(month, year));
}
