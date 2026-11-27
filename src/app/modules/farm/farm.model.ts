import {
  Schema,
  model,
} from "mongoose";

export type FarmType =
  | "Crop"
  | "Orchard"
  | "Poultry"
  | "Livestock"
  | "Fishery";

export interface IFarm {
  farmerId: string;
  farmerEmail: string;

  name: string;

  farmType: FarmType;

  division: string;
  district: string;
  upazila: string;

  landArea?: number;

  unit?:
    | "Bigha"
    | "Acre"
    | "Hectare"
    | "Decimal";

  soilType?: string;

  coverImage?: string;
  description?: string;

  status:
    | "Active"
    | "Inactive";
}

const farmSchema =
  new Schema<IFarm>(
    {
      farmerId: {
        type: String,
        required: true,
        index: true,
      },

      farmerEmail: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        index: true,
      },

      name: {
        type: String,
        required: true,
        trim: true,
      },

      farmType: {
        type: String,
        enum: [
          "Crop",
          "Orchard",
          "Poultry",
          "Livestock",
          "Fishery",
        ],
        required: true,
      },

      division: {
        type: String,
        required: true,
        trim: true,
      },

      district: {
        type: String,
        required: true,
        trim: true,
      },

      upazila: {
        type: String,
        required: true,
        trim: true,
      },

      landArea: {
        type: Number,
        min: 0.01,
      },

      unit: {
        type: String,
        enum: [
          "Bigha",
          "Acre",
          "Hectare",
          "Decimal",
        ],
      },

      soilType: {
        type: String,
        trim: true,
      },

      coverImage: {
        type: String,
        default:
          "https://images.unsplash.com/photo-1500382017468-9049fed747ef",
      },

      description: {
        type: String,
        trim: true,
        default: "",
      },

      status: {
        type: String,
        enum: [
          "Active",
          "Inactive",
        ],
        default: "Active",
      },
    },
    {
      timestamps: true,
    }
  );

export const Farm =
  model<IFarm>(
    "Farm",
    farmSchema
  );