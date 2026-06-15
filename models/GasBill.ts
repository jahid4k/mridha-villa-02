import mongoose, { Document, Schema } from 'mongoose';

export interface IGasBill extends Document {
  tenantId: mongoose.Types.ObjectId;
  leaseId: mongoose.Types.ObjectId;
  unitIds: mongoose.Types.ObjectId[];
  month: number;
  year: number;
  amount: number;
  paidAmount: number;
  dueAmount: number;
  status: 'unpaid' | 'partial' | 'paid' | 'archived';
  paymentDate?: Date;
  notes?: string;
  createdBy: string;
  updatedBy: string;
  archivedAt?: Date;
  archivedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const GasBillSchema = new Schema<IGasBill>(
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
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    amount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    dueAmount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['unpaid', 'partial', 'paid', 'archived'],
      default: 'unpaid',
    },
    paymentDate: { type: Date },
    notes: { type: String },
    createdBy: { type: String, required: true },
    updatedBy: { type: String, required: true },
    archivedAt: { type: Date },
    archivedBy: { type: String },
  },
  { timestamps: true }
);

GasBillSchema.index({ tenantId: 1, month: 1, year: 1 });
GasBillSchema.index({ month: 1, year: 1 });
GasBillSchema.index({ status: 1 });

export default mongoose.models.GasBill || mongoose.model<IGasBill>('GasBill', GasBillSchema);
