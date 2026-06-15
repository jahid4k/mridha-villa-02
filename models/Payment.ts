import mongoose, { Document, Schema } from 'mongoose';

export type PaymentMethod = 'cash' | 'bank' | 'bkash' | 'nagad' | 'rocket' | 'other';
export type PaymentType = 'rent' | 'advance' | 'due' | 'adjustment' | 'other';

export interface IPayment extends Document {
  tenantId: mongoose.Types.ObjectId;
  leaseId: mongoose.Types.ObjectId;
  monthlyRentRecordId?: mongoose.Types.ObjectId;
  amount: number;
  paymentDate: Date;
  paymentMethod: PaymentMethod;
  receivedBy: string;
  paymentType: PaymentType;
  notes?: string;
  receiptNumber?: string;
  attachments: any[];
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

const PaymentSchema = new Schema<IPayment>(
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
    monthlyRentRecordId: {
      type: Schema.Types.ObjectId,
      ref: 'RentRecord',
    },
    amount: { type: Number, required: true, min: 0.01 },
    paymentDate: { type: Date, required: true },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank', 'bkash', 'nagad', 'rocket', 'other'],
      default: 'cash',
    },
    receivedBy: {
      type: String,
      enum: ['jahid', 'jony'],
      required: true,
    },
    paymentType: {
      type: String,
      enum: ['rent', 'advance', 'due', 'adjustment', 'other'],
      default: 'rent',
    },
    notes: { type: String },
    receiptNumber: { type: String, trim: true },
    attachments: { type: mongoose.Schema.Types.Mixed, default: [] },
    createdBy: { type: String, required: true },
    updatedBy: { type: String, required: true },
    archivedAt: { type: Date },
    archivedBy: { type: String },
  },
  { timestamps: true }
);

PaymentSchema.index({ tenantId: 1, paymentDate: -1 });
PaymentSchema.index({ leaseId: 1, paymentDate: -1 });
PaymentSchema.index({ monthlyRentRecordId: 1 });
PaymentSchema.index({ receivedBy: 1 });
PaymentSchema.index({ paymentDate: -1 });
PaymentSchema.index({ archivedAt: 1 });

export default mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema);
