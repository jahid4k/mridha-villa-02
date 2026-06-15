import mongoose, { Document, Schema } from 'mongoose';

export type RentRecordStatus = 'unpaid' | 'partial' | 'paid' | 'overdue' | 'advance' | 'adjusted' | 'archived';

export interface IRentRecord extends Document {
  tenantId: mongoose.Types.ObjectId;
  leaseId: mongoose.Types.ObjectId;
  unitIds: mongoose.Types.ObjectId[];
  collector: string;
  month: number;
  year: number;
  baseRent: number;
  previousDue: number;
  extraCharges: number;
  discount: number;
  advanceAdjustment: number;
  totalPayable: number;
  collectedAmount: number;
  dueAmount: number;
  advanceCreated: number;
  status: RentRecordStatus;
  paymentIds: mongoose.Types.ObjectId[];
  notes?: string;
  generatedBy: string;
  createdBy: string;
  updatedBy: string;
  archivedAt?: Date;
  archivedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RentRecordSchema = new Schema<IRentRecord>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    leaseId: {
      type: Schema.Types.ObjectId,
      ref: 'Lease',
      required: true,
      index: true,
    },
    unitIds: [{ type: Schema.Types.ObjectId, ref: 'Unit' }],
    collector: {
      type: String,
      enum: ['jahid', 'jony'],
      required: true,
      index: true,
    },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    baseRent: { type: Number, required: true, min: 0 },
    previousDue: { type: Number, default: 0, min: 0 },
    extraCharges: { type: Number, default: 0, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    advanceAdjustment: { type: Number, default: 0, min: 0 },
    totalPayable: { type: Number, required: true, min: 0 },
    collectedAmount: { type: Number, default: 0, min: 0 },
    dueAmount: { type: Number, default: 0 },
    advanceCreated: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['unpaid', 'partial', 'paid', 'overdue', 'advance', 'adjusted', 'archived'],
      default: 'unpaid',
    },
    paymentIds: [{ type: Schema.Types.ObjectId, ref: 'Payment' }],
    notes: { type: String },
    generatedBy: { type: String, required: true },
    createdBy: { type: String, required: true },
    updatedBy: { type: String, required: true },
    archivedAt: { type: Date },
    archivedBy: { type: String },
  },
  { timestamps: true }
);

RentRecordSchema.index({ tenantId: 1, month: 1, year: 1 });
RentRecordSchema.index({ leaseId: 1, month: 1, year: 1 });
RentRecordSchema.index({ month: 1, year: 1 });
RentRecordSchema.index({ status: 1 });
RentRecordSchema.index({ collector: 1, month: 1, year: 1 });
// Unique compound index: one rent record per lease per month/year
RentRecordSchema.index({ leaseId: 1, month: 1, year: 1 }, { unique: true, sparse: true });

export default mongoose.models.RentRecord || mongoose.model<IRentRecord>('RentRecord', RentRecordSchema);
