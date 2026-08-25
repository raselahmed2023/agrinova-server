import { Schema, model } from "mongoose";
import { IProduct } from "./product.interface";

const productSchema = new Schema<IProduct>(
  {
    title: {
      type: String,
      required: [true, "Product title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Product description is required"],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Product price is required"],
      min: [0, "Price cannot be negative"],
    },
    category: {
      type: String,
      enum: {
        values: [
          "seeds",
          "fertilizers",
          "pesticides",
          "equipment",
          "crops",
          "livestock",
          "other",
        ],
        message: "{VALUE} is not a valid category",
      },
      required: [true, "Product category is required"],
    },
    quantity: {
      type: Number,
      required: [true, "Product quantity is required"],
      min: [0, "Quantity cannot be negative"],
      default: 1,
    },
    unit: {
      type: String,
      required: [true, "Unit is required"],
      trim: true,
    },
    images: {
      type: [String],
      default: [],
    },
    sellerName: {
      type: String,
      trim: true,
      default: "AgriNova Seller",
    },
    sellerEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    sellerContact: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["available", "out_of_stock"],
      default: "available",
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

productSchema.index({ title: "text", description: "text" });

export const Product = model<IProduct>("Product", productSchema);
