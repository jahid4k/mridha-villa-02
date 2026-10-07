import mongoose from 'mongoose';

// Side-effect imports: register every Mongoose model up front so that any
// route/page calling connectDB() can safely .populate() across models,
// regardless of which model files that specific route happens to import.
// Next.js/Turbopack bundles each route's module graph separately, so a
// model that's only reached indirectly (e.g. via .populate('tenantId'))
// may never get registered otherwise, causing a MissingSchemaError.
// These imports have no named bindings, so they survive "organize imports"
// / unused-import cleanup in editors and linters.
import '@/models/User';
import '@/models/Tenant';
import '@/models/Unit';
import '@/models/Lease';
import '@/models/RentRecord';
import '@/models/Payment';
import '@/models/Expense';
import '@/models/ElectricityBill';
import '@/models/ElectricitySetting';
import '@/models/GasBill';
import '@/models/Setting';
import '@/models/AuditLog';
import '@/models/Counter';

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache;
}

const cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}
