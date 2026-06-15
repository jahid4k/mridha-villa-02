import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Unit from '@/models/Unit';
import Setting from '@/models/Setting';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Seed not allowed in production. Use the CLI seed script.' }, { status: 403 });
  }

  await connectDB();

  const results: string[] = [];

  // Users
  const users = [
    { username: 'jahid', displayName: 'Jahid', password: 'jahid123' },
    { username: 'jony', displayName: 'Jony', password: 'jony123' },
  ];

  for (const u of users) {
    const exists = await User.findOne({ username: u.username });
    if (!exists) {
      await User.create({
        username: u.username,
        displayName: u.displayName,
        email: `${u.username}@mridhavilla.local`,
        password: await bcrypt.hash(u.password, 12),
        role: 'admin',
        isActive: true,
      });
      results.push(`Created user: ${u.username}`);
    } else {
      results.push(`User exists: ${u.username}`);
    }
  }

  // Units
  const units = [
    { unitName: 'Shop 1', unitNumber: 'S1', unitType: 'shop', assignedCollector: 'jahid', defaultMonthlyRent: 10000 },
    { unitName: 'Shop 2', unitNumber: 'S2', unitType: 'shop', assignedCollector: 'jony', defaultMonthlyRent: 10000 },
    { unitName: 'Shop 3', unitNumber: 'S3', unitType: 'shop', assignedCollector: 'jahid', defaultMonthlyRent: 10000 },
    { unitName: 'Shop 4', unitNumber: 'S4', unitType: 'shop', assignedCollector: 'jony', defaultMonthlyRent: 10000 },
    { unitName: 'Shop 5', unitNumber: 'S5', unitType: 'shop', assignedCollector: 'jahid', defaultMonthlyRent: 10000 },
    { unitName: 'Shop 6', unitNumber: 'S6', unitType: 'shop', assignedCollector: 'jahid', defaultMonthlyRent: 10000 },
    { unitName: 'Shop 7', unitNumber: 'S7', unitType: 'shop', assignedCollector: 'jony', defaultMonthlyRent: 10000 },
    { unitName: 'Room 1', unitNumber: 'R1', unitType: 'room', assignedCollector: 'jony', defaultMonthlyRent: 7000 },
    { unitName: 'Room 2', unitNumber: 'R2', unitType: 'room', assignedCollector: 'jony', defaultMonthlyRent: 7000 },
    { unitName: 'Room 3', unitNumber: 'R3', unitType: 'room', assignedCollector: 'jahid', defaultMonthlyRent: 7000 },
    { unitName: 'Room 4', unitNumber: 'R4', unitType: 'room', assignedCollector: 'jony', defaultMonthlyRent: 7000 },
    { unitName: 'Room 5', unitNumber: 'R5', unitType: 'room', assignedCollector: 'jony', defaultMonthlyRent: 7000 },
  ];

  for (const u of units) {
    const exists = await Unit.findOne({ unitNumber: u.unitNumber });
    if (!exists) {
      await Unit.create({
        ...u,
        status: 'vacant',
        hasElectricitySubMeter: true,
        photos: [],
        createdBy: 'system',
        updatedBy: 'system',
      });
      results.push(`Created unit: ${u.unitName}`);
    } else {
      results.push(`Unit exists: ${u.unitName}`);
    }
  }

  // Settings
  const settings = [
    { key: 'buildingName', value: 'Mridha Villa 2', label: 'Building Name' },
    { key: 'currency', value: 'BDT', label: 'Currency' },
    { key: 'defaultElectricityRate', value: 12, label: 'Default Electricity Rate (per unit)' },
    { key: 'defaultRentDueDay', value: 5, label: 'Default Rent Due Day' },
    { key: 'enableSettlement', value: false, label: 'Enable Settlement Module' },
  ];

  for (const s of settings) {
    const exists = await Setting.findOne({ key: s.key });
    if (!exists) {
      await Setting.create({ ...s, updatedBy: 'system' });
      results.push(`Created setting: ${s.key}`);
    } else {
      results.push(`Setting exists: ${s.key}`);
    }
  }

  return NextResponse.json({ success: true, results });
}
