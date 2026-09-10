import {
  Schema,
  model,
} from "mongoose";

import {
  IOrder,
  IOrderFulfillment,
  IOrderItem,
  IShippingAddress,
} from "./order.interface";

import {
  FULFILLMENT_STATUSES,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
} from "./order.constant";

const orderItemSchema =
  new Schema<IOrderItem>(
    {
      productId: {
        type: String,
        required: true,
      },

      title: {
        type: String,
        required: true,
      },

      image: {
        type: String,
      },

      sellerId: {
        type: String,
        required: true,
        index: true,
      },

      sellerName: {
        type: String,
        required: true,
      },

      sellerEmail: {
        type: String,
        required: true,
        lowercase: true,
      },

      quantity: {
        type: Number,
        required: true,
        min: 0,
      },

      unit: {
        type: String,
        required: true,
      },

      price: {
        type: Number,
        required: true,
        min: 0,
      },

      subtotal: {
        type: Number,
        required: true,
        min: 0,
      },
    },
    {
      _id: false,
    }
  );

const fulfillmentSchema =
  new Schema<IOrderFulfillment>(
    {
      sellerId: {
        type: String,
        required: true,
        index: true,
      },

      sellerName: {
        type: String,
        required: true,
      },

      sellerEmail: {
        type: String,
        required: true,
        lowercase: true,
      },

      items: {
        type: [orderItemSchema],
        required: true,
      },

      subtotal: {
        type: Number,
        required: true,
        min: 0,
      },

      commissionRate: {
        type: Number,
        required: true,
        min: 0,
      },

      commissionAmount: {
        type: Number,
        required: true,
        min: 0,
      },

      sellerPayout: {
        type: Number,
        required: true,
        min: 0,
      },

      status: {
        type: String,
        enum: [...FULFILLMENT_STATUSES],
        default: "pending",
      },

      pickupAddress: {
        type: String,
      },

      deliveryPartner: {
        name: String,
        phone: String,
      },
    },
    {
      _id: false,
    }
  );

const shippingAddressSchema =
  new Schema<IShippingAddress>(
    {
      fullName: {
        type: String,
        required: true,
      },

      phone: {
        type: String,
        required: true,
      },

      address: {
        type: String,
        required: true,
      },

      division: {
        type: String,
        required: true,
      },

      district: {
        type: String,
        required: true,
      },

      upazila: {
        type: String,
      },

      postalCode: {
        type: String,
      },
    },
    {
      _id: false,
    }
  );

const orderSchema =
  new Schema<IOrder>(
    {
      orderNumber: {
        type: String,
        required: true,
        unique: true,
        index: true,
      },

      customerId: {
        type: String,
        required: true,
        index: true,
      },

      customerName: {
        type: String,
        required: true,
      },

      customerEmail: {
        type: String,
        required: true,
        lowercase: true,
        index: true,
      },

      items: {
        type: [orderItemSchema],
        required: true,
      },

      fulfillments: {
        type: [fulfillmentSchema],
        required: true,
      },

      shippingAddress: {
        type: shippingAddressSchema,
        required: true,
      },

      subtotal: {
        type: Number,
        required: true,
        min: 0,
      },

      deliveryFee: {
        type: Number,
        required: true,
        min: 0,
      },

      commissionAmount: {
        type: Number,
        required: true,
        min: 0,
      },

      sellerPayoutAmount: {
        type: Number,
        required: true,
        min: 0,
      },

      totalAmount: {
        type: Number,
        required: true,
        min: 0,
      },

      status: {
        type: String,
        enum: [...ORDER_STATUSES],
        default: "pending",
        index: true,
      },

      paymentMethod: {
        type: String,
        enum: [...PAYMENT_METHODS],
        required: true,
      },

      paymentStatus: {
        type: String,
        enum: [...PAYMENT_STATUSES],
        default: "pending",
        index: true,
      },

      paymentReference: {
        type: String,
      },

      stockRestored: {
        type: Boolean,
        default: false,
      },

      notes: {
        type: String,
        trim: true,
      },
    },
    {
      timestamps: true,
    }
  );

orderSchema.index({
  customerId: 1,
  createdAt: -1,
});

orderSchema.index({
  "fulfillments.sellerId": 1,
  createdAt: -1,
});

export const Order =
  model<IOrder>(
    "Order",
    orderSchema
  );