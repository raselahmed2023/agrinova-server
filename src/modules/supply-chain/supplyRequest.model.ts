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
        enum: SUPPLY_CATEGORIES,
        required: [
          true,
          "Category is required",
        ],
      },

      quantity: {
        type: Number,
        required: [
          true,
          "Quantity is required",
        ],
        min: [
          0.01,
          "Quantity must be greater than 0",
        ],
      },

      unit: {
        type: String,
        enum: SUPPLY_UNITS,
        required: [
          true,
          "Unit is required",
        ],
      },

      expectedPrice: {
        type: Number,
        required: [
          true,
          "Expected price is required",
        ],
        min: [
          0,
          "Expected price cannot be negative",
        ],
      },

      division: {
        type: String,
        required: [
          true,
          "Division is required",
        ],
        trim: true,
      },

      district: {
        type: String,
        required: [
          true,
          "District is required",
        ],
        trim: true,
      },

      upazila: {
        type: String,
        required: [
          true,
          "Upazila is required",
        ],
        trim: true,
      },

      location: {
        type: String,
        required: [
          true,
          "Address is required",
        ],
        trim: true,
      },

      branch: {
        type: String,
        enum: AGRINOVA_BRANCHES,
        required: [
          true,
          "AgriNova branch is required",
        ],
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
        enum: SUPPLY_STATUSES,
        default: "SUBMITTED",
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
});

export const SupplyRequest =
  model<ISupplyRequest>(
    "SupplyRequest",
    supplyRequestSchema
  );