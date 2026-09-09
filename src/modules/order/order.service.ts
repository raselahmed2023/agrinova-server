import {
  ClientSession,
  isValidObjectId,
} from "mongoose";

import AppError from "../../utils/AppError";

import {
  Product,
} from "../product/product.model";

import {
  Order,
} from "./order.model";

import {
  IOrderItem,
  IOrderFulfillment,
  IShippingAddress,
} from "./order.interface";

const getCommissionRate = () => {
  const value = Number(
    process.env.MARKETPLACE_COMMISSION_RATE ||
      5
  );

  if (!Number.isFinite(value) || value < 0) {
    return 5;
  }

  return value;
};

const getDeliveryFee = () => {
  const value = Number(
    process.env.MARKETPLACE_DELIVERY_FEE ||
      100
  );

  if (!Number.isFinite(value) || value < 0) {
    return 100;
  }

  return value;
};

const generateOrderNumber = () => {
  const timestamp =
    Date.now().toString().slice(-8);

  const random =
    Math.floor(
      1000 + Math.random() * 9000
    );

  return `AN-${timestamp}-${random}`;
};

const createOrderInDB = async (
  customer: {
    id: string;
    email: string;
    name?: string;
  },

  payload: {
    items: {
      productId: string;
      quantity: number;
    }[];

    shippingAddress: IShippingAddress;

    paymentMethod: "cod" | "card";

    notes?: string;
  }
) => {
  const productIds =
    payload.items.map(
      (item) => item.productId
    );

  const uniqueProductIds =
    [...new Set(productIds)];

  for (const id of uniqueProductIds) {
    if (!isValidObjectId(id)) {
      throw new AppError(
        400,
        `Invalid product ID: ${id}`
      );
    }
  }

  const products =
    await Product.find({
      _id: {
        $in: uniqueProductIds,
      },

      isDeleted: {
        $ne: true,
      },

      status: "available",
    });

  if (
    products.length !==
    uniqueProductIds.length
  ) {
    throw new AppError(
      400,
      "One or more products are unavailable"
    );
  }

  const productMap =
    new Map(
      products.map(
        (product) => [
          String(product._id),
          product,
        ]
      )
    );

  const commissionRate =
    getCommissionRate();

  const orderItems: IOrderItem[] = [];

  for (const cartItem of payload.items) {
    const product =
      productMap.get(
        cartItem.productId
      );

    if (!product) {
      throw new AppError(
        404,
        "Product not found"
      );
    }

    if (
      cartItem.quantity >
      product.quantity
    ) {
      throw new AppError(
        400,
        `${product.title} has only ${product.quantity} ${product.unit} available`
      );
    }

    const price =
      Number(product.price);

    const subtotal =
      price * cartItem.quantity;

    orderItems.push({
      productId:
        String(product._id),

      title:
        product.title,

      image:
        product.images?.[0],

      sellerId:
        product.sellerEmail ||
        "unknown-seller",

      sellerName:
        product.sellerName ||
        "AgriNova Seller",

      sellerEmail:
        product.sellerEmail ||
        "",

      quantity:
        cartItem.quantity,

      unit:
        product.unit,

      price,

      subtotal,
    });
  }

  const grouped =
    new Map<
      string,
      IOrderFulfillment
    >();

  for (const item of orderItems) {
    const sellerKey =
      item.sellerEmail
        .trim()
        .toLowerCase();

    const existing =
      grouped.get(
        sellerKey
      );

    if (existing) {
      existing.items.push(item);

      existing.subtotal +=
        item.subtotal;

      continue;
    }

    grouped.set(
      sellerKey,
      {
        sellerId:
          item.sellerId,

        sellerName:
          item.sellerName,

        sellerEmail:
          sellerKey,

        items: [item],

        subtotal:
          item.subtotal,

        commissionRate,

        commissionAmount: 0,

        sellerPayout: 0,

        status:
          "pending",
      }
    );
  }

  const fulfillments =
    [...grouped.values()];

  let subtotal = 0;

  let commissionAmount = 0;

  let sellerPayoutAmount = 0;

  for (const fulfillment of fulfillments) {
    const commission =
      Number(
        (
          fulfillment.subtotal *
          commissionRate /
          100
        ).toFixed(2)
      );

    const payout =
      Number(
        (
          fulfillment.subtotal -
          commission
        ).toFixed(2)
      );

    fulfillment.commissionAmount =
      commission;

    fulfillment.sellerPayout =
      payout;

    subtotal +=
      fulfillment.subtotal;

    commissionAmount +=
      commission;

    sellerPayoutAmount +=
      payout;
  }

  const deliveryFee =
    getDeliveryFee();

  const totalAmount =
    Number(
      (
        subtotal +
        deliveryFee
      ).toFixed(2)
    );

  const session =
    await Product.startSession();

  try {
    let createdOrder: any;

    await session.withTransaction(
      async () => {
        for (const cartItem of payload.items) {
          const updated =
            await Product.findOneAndUpdate(
              {
                _id:
                  cartItem.productId,

                isDeleted: {
                  $ne: true,
                },

                status:
                  "available",

                quantity: {
                  $gte:
                    cartItem.quantity,
                },
              },

              {
                $inc: {
                  quantity:
                    -cartItem.quantity,
                },
              },

              {
                new: true,

                session,

                runValidators:
                  true,
              }
            );

          if (!updated) {
            throw new AppError(
              409,
              "Product stock changed. Please refresh your cart and try again."
            );
          }

          if (
            Number(
              updated.quantity
            ) <= 0
          ) {
            await Product.updateOne(
              {
                _id:
                  updated._id,
              },
              {
                $set: {
                  status:
                    "out_of_stock",
                },
              },
              {
                session,
              }
            );
          }
        }

        const created =
          await Order.create(
            [
              {
                orderNumber:
                  generateOrderNumber(),

                customerId:
                  customer.id,

                customerName:
                  customer.name ||
                  "Customer",

                customerEmail:
                  customer.email
                    .trim()
                    .toLowerCase(),

                items:
                  orderItems,

                fulfillments,

                shippingAddress:
                  payload.shippingAddress,

                subtotal,

                deliveryFee,

                commissionAmount,

                sellerPayoutAmount,

                totalAmount,

                status:
                  "pending",

                paymentMethod:
                  payload.paymentMethod,

                paymentStatus:
                  payload.paymentMethod ===
                  "card"
                    ? "pending"
                    : "pending",

                notes:
                  payload.notes,
              },
            ],
            {
              session,
            }
          );

        createdOrder =
          created[0];
      }
    );

    return createdOrder;
  } finally {
    await session.endSession();
  }
};

const getMyOrdersFromDB =
  async (
    customerId: string
  ) => {
    return Order.find({
      customerId,
    })
      .sort({
        createdAt: -1,
      })
      .lean();
  };

const getMyOrderByIdFromDB =
  async (
    orderId: string,
    customerId: string
  ) => {
    if (
      !isValidObjectId(orderId)
    ) {
      throw new AppError(
        400,
        "Invalid order ID"
      );
    }

    const order =
      await Order.findOne({
        _id: orderId,

        customerId,
      }).lean();

    if (!order) {
      throw new AppError(
        404,
        "Order not found"
      );
    }

    return order;
  };

const getSellerOrdersFromDB =
  async (
    sellerEmail: string
  ) => {
    return Order.find({
      "fulfillments.sellerEmail":
        sellerEmail
          .trim()
          .toLowerCase(),
    })
      .sort({
        createdAt: -1,
      })
      .lean();
  };

const updateSellerFulfillment =
  async (
    orderId: string,

    sellerEmail: string,

    status: any,

    deliveryPartner?: {
      name?: string;
      phone?: string;
    }
  ) => {
    if (
      !isValidObjectId(orderId)
    ) {
      throw new AppError(
        400,
        "Invalid order ID"
      );
    }

    const order =
      await Order.findOne({
        _id: orderId,

        "fulfillments.sellerEmail":
          sellerEmail
            .trim()
            .toLowerCase(),
      });

    if (!order) {
      throw new AppError(
        404,
        "Order not found"
      );
    }

    const fulfillment =
      order.fulfillments.find(
        (item) =>
          item.sellerEmail ===
          sellerEmail
            .trim()
            .toLowerCase()
      );

    if (!fulfillment) {
      throw new AppError(
        403,
        "You are not a seller in this order"
      );
    }

    fulfillment.status =
      status;

    if (deliveryPartner) {
      fulfillment.deliveryPartner =
        deliveryPartner;
    }

    const statuses =
      order.fulfillments.map(
        (item) => item.status
      );

    if (
      statuses.every(
        (item) =>
          item === "delivered"
      )
    ) {
      order.status =
        "delivered";
    } else if (
      statuses.some(
        (item) =>
          item ===
          "out_for_delivery"
      )
    ) {
      order.status =
        "out_for_delivery";
    } else if (
      statuses.some(
        (item) =>
          item === "picked_up"
      )
    ) {
      order.status =
        "picked_up";
    } else if (
      statuses.some(
        (item) =>
          item ===
          "ready_for_pickup"
      )
    ) {
      order.status =
        statuses.every(
          (item) =>
            item ===
            "ready_for_pickup"
        )
          ? "ready_for_pickup"
          : "partially_fulfilled";
    } else if (
      statuses.some(
        (item) =>
          item === "processing"
      )
    ) {
      order.status =
        "processing";
    } else {
      order.status =
        "confirmed";
    }

    await order.save();

    return order;
  };

const getAllOrdersForAdmin =
  async () => {
    return Order.find({})
      .sort({
        createdAt: -1,
      })
      .lean();
  };

const updateOrderStatusByAdmin =
  async (
    orderId: string,
    status: any
  ) => {
    if (
      !isValidObjectId(orderId)
    ) {
      throw new AppError(
        400,
        "Invalid order ID"
      );
    }

    const order =
      await Order.findByIdAndUpdate(
        orderId,
        {
          $set: {
            status,
          },
        },
        {
          new: true,
          runValidators:
            true,
        }
      );

    if (!order) {
      throw new AppError(
        404,
        "Order not found"
      );
    }

    return order;
  };

export const OrderService = {
  createOrderInDB,

  getMyOrdersFromDB,

  getMyOrderByIdFromDB,

  getSellerOrdersFromDB,

  updateSellerFulfillment,

  getAllOrdersForAdmin,

  updateOrderStatusByAdmin,
};