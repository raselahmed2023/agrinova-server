import {
  Schema,
  model,
} from "mongoose";

import {
  BY_PRODUCT_USES,
  POULTRY_TYPES,
  PRODUCT_CATEGORIES,
  PRODUCT_STATUSES,
  PRODUCTION_METHODS,
  TRANSACTION_TYPES,
} from "./product.constant";

import {
  IProduct,
} from "./product.interface";

const poultryDetailsSchema =
  new Schema(
    {
      poultryType: {
        type: String,
        enum: [
          ...POULTRY_TYPES,
        ],
      },

      breed: {
        type: String,
        trim: true,
      },

      ageWeeks: {
        type: Number,
        min: [
          0,
          "Poultry age cannot be negative",
        ],
      },

      averageWeightKg: {
        type: Number,
        min: [
          0,
          "Poultry weight cannot be negative",
        ],
      },
    },
    {
      _id: false,
    }
  );

const productSchema =
  new Schema<IProduct>(
    {
      title: {
        type: String,
        required: [
          true,
          "Product title is required",
        ],
        trim: true,
      },

      description: {
        type: String,
        required: [
          true,
          "Product description is required",
        ],
        trim: true,
      },

      price: {
        type: Number,
        required: [
          true,
          "Product price is required",
        ],
        min: [
          0,
          "Price cannot be negative",
        ],
      },

      category: {
        type: String,

        enum: {
          values: [
            ...PRODUCT_CATEGORIES,
          ],

          message:
            "{VALUE} is not a valid category",
        },

        required: [
          true,
          "Product category is required",
        ],

        index: true,
      },

      transactionType: {
        type: String,

        enum: [
          ...TRANSACTION_TYPES,
        ],

        default: "sale",

        index: true,
      },

      productionMethod: {
        type: String,

        enum: [
          ...PRODUCTION_METHODS,
        ],

        default:
          "conventional",

        index: true,
      },

      quantity: {
        type: Number,

        required: [
          true,
          "Product quantity is required",
        ],

        min: [
          0,
          "Quantity cannot be negative",
        ],

        default: 1,
      },

      unit: {
        type: String,

        required: [
          true,
          "Unit is required",
        ],

        trim: true,
      },

      images: {
        type: [String],
        default: [],
      },

      sellerName: {
        type: String,
        trim: true,
        default:
          "AgriNova Seller",
      },

      sellerEmail: {
        type: String,
        trim: true,
        lowercase: true,
        index: true,
      },

      sellerContact: {
        type: String,
        trim: true,
      },

      location: {
        type: String,
        trim: true,
      },

      division: {
        type: String,
        trim: true,
      },

      district: {
        type: String,
        trim: true,
        index: true,
      },

      upazila: {
        type: String,
        trim: true,
      },

      poultryDetails: {
        type:
          poultryDetailsSchema,

        default:
          undefined,
      },

      byProductUses: {
        type: [
          {
            type: String,

            enum: [
              ...BY_PRODUCT_USES,
            ],
          },
        ],

        default: [],
      },

      status: {
        type: String,

        enum: [
          ...PRODUCT_STATUSES,
        ],

        default:
          "available",

        index: true,
      },

      isFeatured: {
        type: Boolean,
        default: false,
      },

      isDeleted: {
        type: Boolean,
        default: false,
        index: true,
      },
    },
    {
      timestamps: true,
    }
  );

productSchema.index({
  title: "text",
  description: "text",
});

productSchema.index({
  category: 1,
  status: 1,
  createdAt: -1,
});

productSchema.index({
  productionMethod: 1,
  transactionType: 1,
});

export const Product =
  model<IProduct>(
    "Product",
    productSchema
  );