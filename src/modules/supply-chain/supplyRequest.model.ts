import {
  model,
  Schema,
} from "mongoose";

import {
  AGRINOVA_BRANCHES,
  ISupplyRequest,
  SUPPLY_CATEGORIES,
  SUPPLY_STATUSES,
  SUPPLY_UNITS,
} from "./supplyRequest.interface";

const supplyRequestSchema =
  new Schema<ISupplyRequest>(
    {
      trackingCode: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
        index: true,
      },

      farmerName: {
        type: String,
        required: [
          true,
          "Farmer name is required",
        ],
        trim: true,
      },

      phone: {
        type: String,
        required: [
          true,
          "Phone number is required",
        ],
        trim: true,
      },

      farmerEmail: {
        type: String,
        trim: true,
        lowercase: true,
      },

      productName: {
        type: String,
        required: [
          true,
          "Product name is required",
        ],
        trim: true,
      },

      category: {
        type: String,
        enum:
          SUPPLY_CATEGORIES,
        required: true,
      },

      quantity: {
        type: Number,
        required: true,
        min: 0.01,
      },

      unit: {
        type: String,
        enum:
          SUPPLY_UNITS,
        required: true,
      },

      expectedPrice: {
        type: Number,
        required: true,
        min: 0,
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

      location: {
        type: String,
        required: true,
        trim: true,
      },

      branch: {
        type: String,
        enum:
          AGRINOVA_BRANCHES,
        required: true,
        index: true,
      },

      notes: {
        type: String,
        trim: true,
        default: "",
      },

      images: {
        type: [String],
        default: [],
      },

      status: {
        type: String,
        enum:
          SUPPLY_STATUSES,
        default:
          "SUBMITTED",
        index: true,
      },

      adminNote: {
        type: String,
        trim: true,
        default: "",
      },

      acceptedAt: {
        type: Date,
      },

      rejectedAt: {
        type: Date,
      },

      receivedAt: {
        type: Date,
      },

      completedAt: {
        type: Date,
      },
    },
    {
      timestamps: true,
    }
  );

supplyRequestSchema.index({
  status: 1,
  createdAt: -1,
});

supplyRequestSchema.index({
  branch: 1,
  status: 1,
  createdAt: -1,
});

export const SupplyRequest =
  model<ISupplyRequest>(
    "SupplyRequest",
    supplyRequestSchema
  );