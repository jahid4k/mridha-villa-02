import mongoose, { Document, Schema } from 'mongoose';
import { ICloudinaryFile } from './Unit';

export type TenantStatus = 'active' | 'previous' | 'archived';

export interface ITenantDocument {
  docType: 'nid' | 'agreement' | 'photo' | 'other';
  label: string;
  file: ICloudinaryFile;
}

export interface ITenant extends Document {
  name: string;
  phone: string;
  alternativePhone?: string;
  businessName?: string;
  nidNumber?: string;
  address?: string;
  emergencyContact?: string;
  notes?: string;
  status: TenantStatus;
  documents: ITenantDocument[];
  activeLeaseIds: mongoose.Types.ObjectId[];
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

const TenantDocumentSchema = new Schema<ITenantDocument>({
  docType: {
    type: String,
    enum: ['nid', 'agreement', 'photo', 'other'],
    required: true,
  },
  label: { type: String, required: true },
  file: { type: CloudinaryFileSchema, required: true },
}, { _id: true });

const TenantSchema = new Schema<ITenant>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    alternativePhone: { type: String, trim: true },
    businessName: { type: String, trim: true },
    nidNumber: { type: String, trim: true },
    address: { type: String, trim: true },
    emergencyContact: { type: String, trim: true },
    notes: { type: String },
    status: {
      type: String,
      enum: ['active', 'previous', 'archived'],
      default: 'active',
    },
    documents: { type: [TenantDocumentSchema], default: [] },
    activeLeaseIds: [{ type: Schema.Types.ObjectId, ref: 'Lease' }],
    createdBy: { type: String, required: true },
    updatedBy: { type: String, required: true },
    archivedAt: { type: Date },
    archivedBy: { type: String },
  },
  { timestamps: true }
);

TenantSchema.index({ status: 1 });
TenantSchema.index({ phone: 1 });
TenantSchema.index({ archivedAt: 1 });
TenantSchema.index({ name: 'text', businessName: 'text', phone: 1 });

export default mongoose.models.Tenant || mongoose.model<ITenant>('Tenant', TenantSchema);
