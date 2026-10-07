import mongoose, { Document, Schema } from 'mongoose';

export type LeaseStatus = 'active' | 'ended' | 'archived';
/** monthly: deduct advancePerMonth from each month's rent. final: keep until move-out. */
export type AdvanceMode = 'monthly' | 'final';

export interface ILease extends Document {
  tenantId: mongoose.Types.ObjectId;
  unitIds: mongoose.Types.ObjectId[];
  leaseName?: string;
  monthlyRentAmount: number;
  startDate: Date;
  endDate?: Date;
  rentDueDay: number;
  securityDepositAmount: number;
  /** Deed advance still held (অগ্রিম); used according to advanceMode. */
  advanceBalance: number;
  advanceMode: AdvanceMode;
  advancePerMonth: number;
  /** Money paid beyond what was owed; used up against the next months' rent automatically. */
  creditBalance: number;
  /** Last month (YYYYMM) whose rent/gas has been charged automatically. */
  chargedThrough?: number;
  collector: string;
  status: LeaseStatus;
  agreementDocuments: any[];
  /** The Bangla deed as saved from the New agreement form (DeedInput), for printing again. */
  deed?: Record<string, any>;
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
    // Deed clause ৩.২: rent is due between the 1st and the 7th.
    rentDueDay: { type: Number, default: 7, min: 1, max: 31 },
    securityDepositAmount: { type: Number, default: 0, min: 0 },
    advanceBalance: { type: Number, default: 0, min: 0 },
    advanceMode: { type: String, enum: ['monthly', 'final'], default: 'final' },
    advancePerMonth: { type: Number, default: 0, min: 0 },
    creditBalance: { type: Number, default: 0, min: 0 },
    chargedThrough: { type: Number },
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
    deed: { type: mongoose.Schema.Types.Mixed },
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
