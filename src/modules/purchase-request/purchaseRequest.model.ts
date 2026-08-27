import { model, Schema } from "mongoose";

import type {
  IPurchaseRequest,
  TPurchaseRequestStatus,
} from "./purchaseRequest.interface";

const statuses: TPurchaseRequestStatus[] = [
  "PENDING",
  "ACCEPTED",
  "REJECTED",
  "PROCESSING",
  "COMPLETED",
  "CANCELLED",
];

const purchaseRequestSchema =
  new Schema<IPurchaseRequest>(
    {
      productId: {
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true,
        index: true,
      },

      productTitle: {
        type: String,
        required: true,
        trim: true,
      },

      productPrice: {
        type: Number,
        required: true,
        min: 0,
      },

      buyerId: {
        type: String,
        trim: true,
      },

      buyerName: {
        type: String,
        trim: true,
        default: "AgriNova Buyer",
      },

      buyerEmail: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        index: true,
      },

      sellerName: {
        type: String,
        trim: true,
        default: "AgriNova Seller",
      },

      sellerEmail: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        index: true,
      },

      quantity: {
        type: Number,
        required: true,
        min: 1,
      },

      unit: {
        type: String,
        required: true,
        trim: true,
      },

      deliveryLocation: {
        type: String,
        required: true,
        trim: true,
      },

      note: {
        type: String,
        trim: true,
        maxlength: 1000,
      },

      status: {
        type: String,
        enum: statuses,
        default: "PENDING",
        index: true,
      },
    },
    {
      timestamps: true,
    }
  );

purchaseRequestSchema.index({
  buyerEmail: 1,
  createdAt: -1,
});

purchaseRequestSchema.index({
  sellerEmail: 1,
  createdAt: -1,
});

export const PurchaseRequest =
  model<IPurchaseRequest>(
    "PurchaseRequest",
    purchaseRequestSchema
  );