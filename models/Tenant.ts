/**
 * Tenant.ts — UPDATED MODEL
 *
 * Changes from original:
 *   1. Added `profilePhoto?: ICloudinaryFile` field for tenant headshot/portrait
 *   2. Added `nidNumber`, `permanentAddress`, `guardianName` fields
 *      (needed for agreement PDF — add these if not already in your model)
 *
 * Merge this with your existing Tenant model. Only add fields you don't already have.
 */

import mongoose, { Document, Schema } from "mongoose";

// ─── Re-export CloudinaryFile type (should match your Unit.ts definition) ───
export interface ICloudinaryFile {
  url: string;
  secureUrl: string;
  publicId: string;
  resourceType?: string;
  format?: string;
  originalFilename?: string;
  size?: number;
  uploadedBy: string;
  uploadedAt: Date;
}

const CloudinaryFileSchema = new Schema<ICloudinaryFile>(
  {
    url: { type: String, required: true },
    secureUrl: { type: String, required: true },
    publicId: { type: String, required: true },
    resourceType: { type: String, default: "image" },
    format: { type: String },
    originalFilename: { type: String },
    size: { type: Number },
    uploadedBy: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

// ─── Tenant Document type ───
export interface ITenantDocument {
  docType: "nid" | "agreement" | "photo" | "passport" | "other";
  label: string;
  file: ICloudinaryFile;
}

const TenantDocumentSchema = new Schema<ITenantDocument>(
  {
    docType: {
      type: String,
      enum: ["nid", "agreement", "photo", "passport", "other"],
      required: true,
    },
    label: { type: String, required: true },
    file: { type: CloudinaryFileSchema, required: true },
  },
  { _id: false },
);

export type TenantStatus = "active" | "previous" | "archived";

// ─── Main Tenant interface ───
export interface ITenant extends Document {
  name: string;
  phone: string;
  alternativePhone?: string;
  email?: string;

  // ── NEW: Profile photo ──────────────────────────────────────────
  profilePhoto?: ICloudinaryFile;
  // ────────────────────────────────────────────────────────────────

  // Identity & address (also used for PDF generation)
  nidNumber?: string;
  dateOfBirth?: Date;
  presentAddress?: string;
  permanentAddress?: string;
  guardianName?: string; // father's or guardian's name

  // Business/occupational info
  businessName?: string;
  businessType?: string;
  tradeLicenseNumber?: string;

  // Emergency contact
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;

  // Documents (NID scans, agreements, etc.)
  documents: ITenantDocument[];

  // Status
  status: TenantStatus;
  notes?: string;

  // Audit
  createdBy: string;
  updatedBy: string;
  archivedAt?: Date;
  archivedBy?: string;

  // Timestamps (from Mongoose)
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ───
const TenantSchema = new Schema<ITenant>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    alternativePhone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },

    // ── NEW: Profile photo field ─────────────────────────────────
    profilePhoto: { type: CloudinaryFileSchema },
    // ────────────────────────────────────────────────────────────

    nidNumber: { type: String, trim: true },
    dateOfBirth: { type: Date },
    presentAddress: { type: String, trim: true },
    permanentAddress: { type: String, trim: true },
    guardianName: { type: String, trim: true },

    businessName: { type: String, trim: true },
    businessType: { type: String, trim: true },
    tradeLicenseNumber: { type: String, trim: true },

    emergencyContactName: { type: String, trim: true },
    emergencyContactPhone: { type: String, trim: true },
    emergencyContactRelation: { type: String, trim: true },

    documents: { type: [TenantDocumentSchema], default: [] },

    status: {
      type: String,
      enum: ["active", "previous", "archived"],
      default: "active",
    },
    notes: { type: String },

    createdBy: { type: String, required: true },
    updatedBy: { type: String, required: true },
    archivedAt: { type: Date },
    archivedBy: { type: String },
  },
  { timestamps: true },
);

// Indexes
TenantSchema.index({ status: 1 });
TenantSchema.index({ phone: 1 });
TenantSchema.index({ name: "text" });
TenantSchema.index({ archivedAt: 1 });

export default mongoose.models.Tenant ||
  mongoose.model<ITenant>("Tenant", TenantSchema);
