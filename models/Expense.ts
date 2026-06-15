import mongoose, { Document, Schema } from 'mongoose';

export type ExpenseCategory = 'water' | 'repair' | 'maintenance' | 'cleaner' | 'security' | 'tax' | 'common_electricity' | 'legal' | 'renovation' | 'other';
export type ExpenseTreatment = 'brotherMaintained' | 'shared50_50' | 'assignedToJahid' | 'assignedToJony' | 'custom';

export interface IExpense extends Document {
  title: string;
  category: ExpenseCategory;
  amount: number;
  paidBy: string;
  expenseDate: Date;
  month: number;
  year: number;
  relatedUnitId?: mongoose.Types.ObjectId;
  attachment?: any;
  expenseTreatment: ExpenseTreatment;
  customShare?: {
    jahid: number;
    jony: number;
  };
  notes?: string;
  status: 'active' | 'archived';
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

const ExpenseSchema = new Schema<IExpense>(
  {
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['water', 'repair', 'maintenance', 'cleaner', 'security', 'tax', 'common_electricity', 'legal', 'renovation', 'other'],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    paidBy: {
      type: String,
      enum: ['jahid', 'jony'],
      required: true,
    },
    expenseDate: { type: Date, required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    relatedUnitId: { type: Schema.Types.ObjectId, ref: 'Unit' },
    attachment: { type: CloudinaryFileSchema },
    expenseTreatment: {
      type: String,
      enum: ['brotherMaintained', 'shared50_50', 'assignedToJahid', 'assignedToJony', 'custom'],
      default: 'brotherMaintained',
    },
    customShare: {
      jahid: { type: Number, min: 0 },
      jony: { type: Number, min: 0 },
    },
    notes: { type: String },
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
    },
    createdBy: { type: String, required: true },
    updatedBy: { type: String, required: true },
    archivedAt: { type: Date },
    archivedBy: { type: String },
  },
  { timestamps: true }
);

ExpenseSchema.index({ month: 1, year: 1 });
ExpenseSchema.index({ category: 1 });
ExpenseSchema.index({ paidBy: 1 });
ExpenseSchema.index({ status: 1 });
ExpenseSchema.index({ expenseDate: -1 });

export default mongoose.models.Expense || mongoose.model<IExpense>('Expense', ExpenseSchema);
