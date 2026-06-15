import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const MONGODB_URI = process.env.MONGODB_URI!;

// ---- Inline minimal schemas for seeding ----
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  displayName: { type: String, required: true },
  email: String,
  password: { type: String, required: true },
  role: { type: String, default: 'admin' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

const UnitSchema = new mongoose.Schema({
  unitName: String,
  unitNumber: String,
  unitType: String,
  floorOrLocation: String,
  defaultMonthlyRent: { type: Number, default: 0 },
  assignedCollector: String,
  status: { type: String, default: 'vacant' },
  hasElectricitySubMeter: { type: Boolean, default: true },
  electricityMeterNumber: String,
  photos: { type: Array, default: [] },
  createdBy: { type: String, default: 'system' },
  updatedBy: { type: String, default: 'system' },
}, { timestamps: true });

const SettingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: mongoose.Schema.Types.Mixed,
  label: String,
  description: String,
  updatedBy: { type: String, default: 'system' },
}, { timestamps: true });

async function seed() {
  console.log('🌱 Starting seed...');
  console.log('Connecting to MongoDB...');

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);
    const UnitModel = mongoose.models.Unit || mongoose.model('Unit', UnitSchema);
    const SettingModel = mongoose.models.Setting || mongoose.model('Setting', SettingSchema);

    // ---- Seed Admin Users ----
    console.log('\n👤 Seeding admin users...');

    const adminUsers = [
      {
        username: 'jahid',
        displayName: 'Jahid',
        email: 'jahid@mridhavilla.local',
        password: await bcrypt.hash('jahid123', 12),
        role: 'admin',
        isActive: true,
      },
      {
        username: 'jony',
        displayName: 'Jony',
        email: 'jony@mridhavilla.local',
        password: await bcrypt.hash('jony123', 12),
        role: 'admin',
        isActive: true,
      },
    ];

    for (const userData of adminUsers) {
      const existing = await UserModel.findOne({ username: userData.username });
      if (existing) {
        console.log(`  ↩️  User '${userData.username}' already exists, skipping`);
      } else {
        await UserModel.create(userData);
        console.log(`  ✅ Created user: ${userData.username} (password: ${userData.username}123)`);
      }
    }

    // ---- Seed Units ----
    console.log('\n🏢 Seeding units...');

    const units = [
      // Shops
      { unitName: 'Shop 1', unitNumber: 'S1', unitType: 'shop', assignedCollector: 'jahid', defaultMonthlyRent: 10000 },
      { unitName: 'Shop 2', unitNumber: 'S2', unitType: 'shop', assignedCollector: 'jony', defaultMonthlyRent: 10000 },
      { unitName: 'Shop 3', unitNumber: 'S3', unitType: 'shop', assignedCollector: 'jahid', defaultMonthlyRent: 10000 },
      { unitName: 'Shop 4', unitNumber: 'S4', unitType: 'shop', assignedCollector: 'jony', defaultMonthlyRent: 10000 },
      { unitName: 'Shop 5', unitNumber: 'S5', unitType: 'shop', assignedCollector: 'jahid', defaultMonthlyRent: 10000 },
      { unitName: 'Shop 6', unitNumber: 'S6', unitType: 'shop', assignedCollector: 'jahid', defaultMonthlyRent: 10000 },
      { unitName: 'Shop 7', unitNumber: 'S7', unitType: 'shop', assignedCollector: 'jony', defaultMonthlyRent: 10000 },
      // Rooms
      { unitName: 'Room 1', unitNumber: 'R1', unitType: 'room', assignedCollector: 'jony', defaultMonthlyRent: 7000 },
      { unitName: 'Room 2', unitNumber: 'R2', unitType: 'room', assignedCollector: 'jony', defaultMonthlyRent: 7000 },
      { unitName: 'Room 3', unitNumber: 'R3', unitType: 'room', assignedCollector: 'jahid', defaultMonthlyRent: 7000 },
      { unitName: 'Room 4', unitNumber: 'R4', unitType: 'room', assignedCollector: 'jony', defaultMonthlyRent: 7000 },
      { unitName: 'Room 5', unitNumber: 'R5', unitType: 'room', assignedCollector: 'jony', defaultMonthlyRent: 7000 },
    ];

    for (const unitData of units) {
      const existing = await UnitModel.findOne({ unitNumber: unitData.unitNumber });
      if (existing) {
        console.log(`  ↩️  Unit '${unitData.unitName}' already exists, skipping`);
      } else {
        await UnitModel.create({
          ...unitData,
          status: 'vacant',
          hasElectricitySubMeter: true,
          photos: [],
          createdBy: 'system',
          updatedBy: 'system',
        });
        console.log(`  ✅ Created: ${unitData.unitName} → ${unitData.assignedCollector}`);
      }
    }

    // ---- Seed Settings ----
    console.log('\n⚙️  Seeding default settings...');

    const settings = [
      {
        key: 'buildingName',
        value: 'Mridha Villa 2',
        label: 'Building Name',
        description: 'Name of the property',
      },
      {
        key: 'currency',
        value: 'BDT',
        label: 'Currency',
        description: 'Default currency (BDT)',
      },
      {
        key: 'defaultElectricityRate',
        value: 12,
        label: 'Default Electricity Rate (per unit)',
        description: 'Default rate in BDT per unit of electricity consumed',
      },
      {
        key: 'defaultRentDueDay',
        value: 5,
        label: 'Default Rent Due Day',
        description: 'Day of month by which rent is due',
      },
      {
        key: 'enableSettlement',
        value: false,
        label: 'Enable Settlement Module',
        description: 'Future-ready: enable owner settlement tracking',
      },
    ];

    for (const setting of settings) {
      const existing = await SettingModel.findOne({ key: setting.key });
      if (existing) {
        console.log(`  ↩️  Setting '${setting.key}' already exists, skipping`);
      } else {
        await SettingModel.create({ ...setting, updatedBy: 'system' });
        console.log(`  ✅ Created setting: ${setting.key} = ${JSON.stringify(setting.value)}`);
      }
    }

    console.log('\n🎉 Seed completed successfully!\n');
    console.log('Default credentials:');
    console.log('  Username: jahid  | Password: jahid123');
    console.log('  Username: jony   | Password: jony123');
    console.log('\n⚠️  IMPORTANT: Change these passwords after first login!\n');

  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seed();
