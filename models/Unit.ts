import mongoose, { Document, Schema } from 'mongoose';

export type UnitType = 'shop' | 'room' | 'flat' | 'garage' | 'storage' | 'rooftop' | 'other';
export type UnitStatus = 'vacant' | 'occupied' | 'maintenance' | 'archived';
export type Collector = 'jahid' | 'jony';

export interface ICloudinaryFile {
  url: string;
  secureUrl: string;
  publicId: string;
  resourceType: string;
  format: string;
  originalFilename: string;
  size: number;
  uploadedBy: string;
  uploadedAt: Date;
}

export interface IUnit extends Document {
  unitName: string;
  unitNumber: string;
  unitType: UnitType;
  floorOrLocation?: string;
  size?: string;
  defaultMonthlyRent: number;
  assignedCollector: Collector;
  status: UnitStatus;
  hasElectricitySubMeter: boolean;
  /** Fixed gas charge billed automatically every month (0 = no gas). */
  gasMonthlyCharge: number;
  electricityMeterNumber?: string;
  notes?: string;
  photos: ICloudinaryFile[];
  currentLeaseId?: mongoose.Types.ObjectId;
  currentTenantId?: mongoose.Types.ObjectId;
  createdBy: string;
  updatedBy: string;
  archivedAt?: Date;
  archivedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CloudinaryFileSchema = new Schema<ICloudinaryFile>({
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

const UnitSchema = new Schema<IUnit>(
  {
    unitName: { type: String, required: true, trim: true },
    unitNumber: { type: String, required: true, trim: true },
    unitType: {
      type: String,
      enum: ['shop', 'room', 'flat', 'garage', 'storage', 'rooftop', 'other'],
      required: true,
    },
    floorOrLocation: { type: String, trim: true },
    size: { type: String, trim: true },
    defaultMonthlyRent: { type: Number, required: true, min: 0 },
    assignedCollector: {
      type: String,
      enum: ['jahid', 'jony'],
      required: true,
    },
    status: {
      type: String,
      enum: ['vacant', 'occupied', 'maintenance', 'archived'],
      default: 'vacant',
    },
    hasElectricitySubMeter: { type: Boolean, default: false },
    gasMonthlyCharge: { type: Number, default: 0, min: 0 },
    electricityMeterNumber: { type: String, trim: true },
    notes: { type: String },
    photos: { type: [CloudinaryFileSchema], default: [] },
    currentLeaseId: { type: Schema.Types.ObjectId, ref: 'Lease' },
    currentTenantId: { type: Schema.Types.ObjectId, ref: 'Tenant' },
    createdBy: { type: String, required: true },
    updatedBy: { type: String, required: true },
    archivedAt: { type: Date },
    archivedBy: { type: String },
  },
  { timestamps: true }
);

UnitSchema.index({ status: 1 });
UnitSchema.index({ assignedCollector: 1 });
UnitSchema.index({ unitType: 1 });
UnitSchema.index({ currentTenantId: 1 });
UnitSchema.index({ archivedAt: 1 });

export default mongoose.models.Unit || mongoose.model<IUnit>('Unit', UnitSchema);
