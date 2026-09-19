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
        required: [
          true,
          "Tracking code is required",
        ],
        unique: true,
        uppercase: true,
        trim: true,
        index: true,
        immutable: true,
        match: [
          /^AGN-[A-F0-9]{8}$/,
          "Invalid tracking code",
        ],
      },

      farmerId: {
        type: String,
        required: [
          true,
          "Farmer ID is required",
        ],
        trim: true,
        index: true,
        immutable: true,
      },

      farmerName: {
        type: String,
        required: [
          true,
          "Farmer name is required",
        ],
        trim: true,
        minlength: [
          2,
          "Farmer name must be at least 2 characters",
        ],
        maxlength: [
          100,
          "Farmer name cannot exceed 100 characters",
        ],
      },

      phone: {
        type: String,
        required: [
          true,
          "Phone number is required",
        ],
        trim: true,
        match: [
          /^01[3-9]\d{8}$/,
          "Invalid Bangladeshi phone number",
        ],
      },

      farmerEmail: {
        type: String,
        trim: true,
        lowercase: true,
        index: true,
      },

      productName: {
        type: String,
        required: [
          true,
          "Product name is required",
        ],
        trim: true,
        minlength: [
          2,
          "Product name must be at least 2 characters",
        ],
        maxlength: [
          120,
          "Product name cannot exceed 120 characters",
        ],
      },

      category: {
        type: String,
        enum:
          SUPPLY_CATEGORIES,
        required: true,
      },

      quantity: {
        type: Number,
        required: [
          true,
          "Quantity is required",
        ],
        validate: {
          validator: (
            value: number
          ) =>
            Number.isFinite(
              value
            ) && value > 0,
          message:
            "Quantity must be greater than 0",
        },
      },

      unit: {
        type: String,
        enum:
          SUPPLY_UNITS,
        required: true,
      },

      expectedPrice: {
        type: Number,
        required: [
          true,
          "Expected price is required",
        ],
        validate: {
          validator: (
            value: number
          ) =>
            Number.isFinite(
              value
            ) && value > 0,
          message:
            "Expected price must be greater than 0",
        },
      },

      division: {
        type: String,
        required: [
          true,
          "Division is required",
        ],
        trim: true,
        maxlength: [
          100,
          "Division cannot exceed 100 characters",
        ],
      },

      district: {
        type: String,
        required: [
          true,
          "District is required",
        ],
        trim: true,
        maxlength: [
          100,
          "District cannot exceed 100 characters",
        ],
      },

      upazila: {
        type: String,
        required: [
          true,
          "Upazila is required",
        ],
        trim: true,
        maxlength: [
          100,
          "Upazila cannot exceed 100 characters",
        ],
      },

      location: {
        type: String,
        required: [
          true,
          "Location is required",
        ],
        trim: true,
        minlength: [
          2,
          "Location must be at least 2 characters",
        ],
        maxlength: [
          250,
          "Location cannot exceed 250 characters",
        ],
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
        maxlength: [
          1000,
          "Notes cannot exceed 1000 characters",
        ],
        default: "",
      },

      images: {
        type: [String],
        default: [],
        validate: {
          validator: (
            value: string[]
          ) =>
            Array.isArray(
              value
            ) &&
            value.length <= 5,
          message:
            "You can upload a maximum of 5 images",
        },
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
        maxlength: [
          1500,
          "Admin note cannot exceed 1500 characters",
        ],
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
  farmerId: 1,
  createdAt: -1,
});

supplyRequestSchema.index({
  farmerId: 1,
  status: 1,
  createdAt: -1,
});

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
