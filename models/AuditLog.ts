import mongoose, { Document, Schema } from 'mongoose';

export type AuditAction = 'create' | 'update' | 'archive' | 'restore' | 'payment' | 'adjustment' | 'delete' | 'login' | 'generate';
export type EntityType = 'user' | 'unit' | 'tenant' | 'lease' | 'rentRecord' | 'payment' | 'electricityBill' | 'gasBill' | 'expense' | 'setting' | 'document';

export interface IAuditLog extends Document {
  entityType: EntityType;
  entityId: string;
  action: AuditAction;
  performedBy: string;
  performedAt: Date;
  previousData?: Record<string, any>;
  newData?: Record<string, any>;
  changedFields?: string[];
  note?: string;
  ipAddress?: string;
  userAgent?: string;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    entityType: {
      type: String,
      enum: ['user', 'unit', 'tenant', 'lease', 'rentRecord', 'payment', 'electricityBill', 'gasBill', 'expense', 'setting', 'document'],
      required: true,
      index: true,
    },
    entityId: { type: String, required: true, index: true },
    action: {
      type: String,
      enum: ['create', 'update', 'archive', 'restore', 'payment', 'adjustment', 'delete', 'login', 'generate'],
      required: true,
      index: true,
    },
    performedBy: { type: String, required: true, index: true },
    performedAt: { type: Date, default: Date.now, index: true },
    previousData: { type: Schema.Types.Mixed },
    newData: { type: Schema.Types.Mixed },
    changedFields: [{ type: String }],
    note: { type: String },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  {
    timestamps: false,
    versionKey: false,
  }
);

AuditLogSchema.index({ performedAt: -1 });
AuditLogSchema.index({ entityType: 1, entityId: 1 });
AuditLogSchema.index({ performedBy: 1, performedAt: -1 });

export default mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
