import mongoose, { Document, Schema } from 'mongoose';

export type LeaseStatus = 'active' | 'ended' | 'archived';

export interface ILease extends Document {
  tenantId: mongoose.Types.ObjectId;
  unitIds: mongoose.Types.ObjectId[];
  leaseName?: string;
  monthlyRentAmount: number;
  startDate: Date;
  endDate?: Date;
  rentDueDay: number;
  securityDepositAmount: number;
  advanceBalance: number;
  collector: string;
  status: LeaseStatus;
  agreementDocuments: any[];
  notes?: string;
  createdBy: string;
  updatedBy: string;
  archivedAt?: Date;
  archivedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CloudinaryFileSchema = new Schema({
  url: { type: String, required: true },
  secureUrl: { type: String, required: true },
  publicId: { type: String, required: true },
  resourceType: { type: String, default: 'image' },
  format: { type: String },
  originalFilename: { type: String },
  size: { type: Number },
  uploadedBy: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
}, { _id: false });

const LeaseSchema = new Schema<ILease>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: 'Tenant',
      required: true,
      index: true,
    },
    unitIds: [{
      type: Schema.Types.ObjectId,
      ref: 'Unit',
      required: true,
    }],
    leaseName: { type: String, trim: true },
    monthlyRentAmount: { type: Number, required: true, min: 0 },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    rentDueDay: { type: Number, default: 5, min: 1, max: 31 },
    securityDepositAmount: { type: Number, default: 0, min: 0 },
    advanceBalance: { type: Number, default: 0, min: 0 },
    collector: {
      type: String,
      enum: ['jahid', 'jony'],
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'ended', 'archived'],
      default: 'active',
    },
    agreementDocuments: { type: mongoose.Schema.Types.Mixed, default: [] },
    notes: { type: String },
    createdBy: { type: String, required: true },
    updatedBy: { type: String, required: true },
    archivedAt: { type: Date },
    archivedBy: { type: String },
  },
  { timestamps: true }
);

LeaseSchema.index({ tenantId: 1, status: 1 });
LeaseSchema.index({ unitIds: 1 });
LeaseSchema.index({ status: 1 });
LeaseSchema.index({ collector: 1 });
LeaseSchema.index({ archivedAt: 1 });

export default mongoose.models.Lease || mongoose.model<ILease>('Lease', LeaseSchema);
