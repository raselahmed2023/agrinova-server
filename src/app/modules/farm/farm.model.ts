import { Schema, model } from 'mongoose';

export interface IFarm {
  name: string;
  division: string;
  district: string;
  landArea: number;
  unit: 'Bigha' | 'Acre' | 'Hectare' | 'Decimal';
  soilType: string;
  coverImage?: string;
  description?: string;
  status: 'Active' | 'Inactive';
  activeCropsCount: number;
}

const farmSchema = new Schema<IFarm>(
  {
    name: { type: String, required: true, trim: true },
    division: { type: String, required: true },
    district: { type: String, required: true },
    landArea: { type: Number, required: true },
    unit: {
      type: String,
      enum: ['Bigha', 'Acre', 'Hectare', 'Decimal'],
      default: 'Bigha',
    },
    soilType: { type: String, required: true },
    coverImage: {
      type: String,
      default: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef',
    },
    description: { type: String, default: '' },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    activeCropsCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Farm = model<IFarm>('Farm', farmSchema);