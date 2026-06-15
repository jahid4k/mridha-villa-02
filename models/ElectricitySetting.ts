import mongoose, { Document, Schema } from 'mongoose';

export interface IElectricitySetting extends Document {
  month: number;
  year: number;
  globalRatePerUnit: number;
  notes?: string;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const ElectricitySettingSchema = new Schema<IElectricitySetting>(
  {
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    globalRatePerUnit: { type: Number, required: true, min: 0 },
    notes: { type: String },
    createdBy: { type: String, required: true },
    updatedBy: { type: String, required: true },
  },
  { timestamps: true }
);

ElectricitySettingSchema.index({ month: 1, year: 1 }, { unique: true });

export default mongoose.models.ElectricitySetting || mongoose.model<IElectricitySetting>('ElectricitySetting', ElectricitySettingSchema);
