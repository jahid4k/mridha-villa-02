import mongoose, { Document, Schema } from 'mongoose';

export type BillStatus = 'unpaid' | 'partial' | 'paid' | 'archived';

export interface IElectricityPayment {
  amount: number;
  paidAt: Date;
  receivedBy: string;
}

export interface IElectricityBill extends Document {
  tenantId: mongoose.Types.ObjectId;
  leaseId: mongoose.Types.ObjectId;
  unitId: mongoose.Types.ObjectId;
  month: number;
  year: number;
  previousReading: number;
  currentReading: number;
  consumedUnits: number;
  globalRatePerUnit: number;
  calculatedAmount: number;
  manualAdjustment: number;
  finalAmount: number;
  paidAmount: number;
  dueAmount: number;
  status: BillStatus;
  paymentDate?: Date;
  payments: IElectricityPayment[];
  notes?: string;
  billPhoto?: any;
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

const ElectricityPaymentSchema = new Schema({
  amount: { type: Number, required: true, min: 0 },
  paidAt: { type: Date, required: true },
  receivedBy: { type: String, required: true },
}, { _id: false });

const ElectricityBillSchema = new Schema<IElectricityBill>(
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
    unitId: {
      type: Schema.Types.ObjectId,
      ref: 'Unit',
      required: true,
      index: true,
    },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    previousReading: { type: Number, required: true, min: 0 },
    currentReading: { type: Number, required: true, min: 0 },
    consumedUnits: { type: Number, required: true, min: 0 },
    globalRatePerUnit: { type: Number, required: true, min: 0 },
    calculatedAmount: { type: Number, required: true, min: 0 },
    manualAdjustment: { type: Number, default: 0 },
    finalAmount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    dueAmount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['unpaid', 'partial', 'paid', 'archived'],
      default: 'unpaid',
    },
    paymentDate: { type: Date },
    payments: { type: [ElectricityPaymentSchema], default: [] },
    notes: { type: String },
    billPhoto: { type: CloudinaryFileSchema },
    createdBy: { type: String, required: true },
    updatedBy: { type: String, required: true },
    archivedAt: { type: Date },
    archivedBy: { type: String },
  },
  { timestamps: true }
);

ElectricityBillSchema.index({ tenantId: 1, month: 1, year: 1 });
ElectricityBillSchema.index({ unitId: 1, month: 1, year: 1 });
ElectricityBillSchema.index({ month: 1, year: 1 });
ElectricityBillSchema.index({ status: 1 });

export default mongoose.models.ElectricityBill || mongoose.model<IElectricityBill>('ElectricityBill', ElectricityBillSchema);
