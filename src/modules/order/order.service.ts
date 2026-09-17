import {
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
  IOrderFulfillment,
  IOrderItem,
  IShippingAddress,
} from "./order.interface";

/* ============================================================
   CONFIG
============================================================ */

const getCommissionRate =
  () => {
    const value =
      Number(
        process.env
          .MARKETPLACE_COMMISSION_RATE ||
          5
      );

    if (
      !Number.isFinite(
        value
      ) ||
      value < 0
    ) {
      return 5;
    }

    return value;
  };

/**
 * Delivery fee PER seller.
 */
const getDeliveryFee =
  () => {
    const value =
      Number(
        process.env
          .MARKETPLACE_DELIVERY_FEE ||
          120
      );

    if (
      !Number.isFinite(
        value
      ) ||
      value < 0
    ) {
      return 120;
    }

    return value;
  };

/* ============================================================
   2A - CHECKOUT CONFIG
============================================================ */

const getCheckoutConfig =
  () => {
    const fee =
      getDeliveryFee();

    return {
      /**
       * Old client compatibility.
       */
      deliveryFee:
        fee,

      /**
       * New multi-seller meaning.
       */
      deliveryFeePerSeller:
        fee,
    };
  };

/* ============================================================
   ORDER NUMBER
============================================================ */

const generateOrderNumber =
  () => {
    const timestamp =
      Date.now()
        .toString()
        .slice(
          -8
        );

    const random =
      Math.floor(
        1000 +
          Math.random() *
            9000
      );

    return `AN-${timestamp}-${random}`;
  };

/* ============================================================
   MASTER ORDER STATUS
============================================================ */

const recalculateOrderStatus =
  (
    order:
      any
  ) => {
    const statuses =
      order.fulfillments.map(
        (
          item:
            any
        ) =>
          item.status
      );

    if (
      statuses.length ===
      0
    ) {
      order.status =
        "pending";

      return;
    }

    const allCancelled =
      statuses.every(
        (
          status:
            string
        ) =>
          status ===
          "cancelled"
      );

    const allDelivered =
      statuses.every(
        (
          status:
            string
        ) =>
          status ===
          "delivered"
      );

    const anyDelivered =
      statuses.some(
        (
          status:
            string
        ) =>
          status ===
          "delivered"
      );

    const anyOutForDelivery =
      statuses.some(
        (
          status:
            string
        ) =>
          status ===
          "out_for_delivery"
      );

    const anyPickedUp =
      statuses.some(
        (
          status:
            string
        ) =>
          status ===
          "picked_up"
      );

    const allReadyForPickup =
      statuses.every(
        (
          status:
            string
        ) =>
          status ===
          "ready_for_pickup"
      );

    const anyReadyForPickup =
      statuses.some(
        (
          status:
            string
        ) =>
          status ===
          "ready_for_pickup"
      );

    const anyProcessing =
      statuses.some(
        (
          status:
            string
        ) =>
          status ===
          "processing"
      );

    const anyConfirmed =
      statuses.some(
        (
          status:
            string
        ) =>
          status ===
          "confirmed"
      );

    if (
      allCancelled
    ) {
      order.status =
        "cancelled";
    } else if (
      allDelivered
    ) {
      order.status =
        "delivered";
    } else if (
      anyDelivered
    ) {
      order.status =
        "partially_fulfilled";
    } else if (
      anyOutForDelivery
    ) {
      order.status =
        "out_for_delivery";
    } else if (
      anyPickedUp
    ) {
      order.status =
        "picked_up";
    } else if (
      allReadyForPickup
    ) {
      order.status =
        "ready_for_pickup";
    } else if (
      anyReadyForPickup
    ) {
      order.status =
        "partially_fulfilled";
    } else if (
      anyProcessing
    ) {
      order.status =
        "processing";
    } else if (
      anyConfirmed
    ) {
      order.status =
        "confirmed";
    } else {
      order.status =
        "pending";
    }
  };

/* ============================================================
   CREATE ORDER
============================================================ */

const createOrderInDB =
  async (
    customer: {
      id: string;
      email: string;
      name?: string;
    },

    payload: {
      idempotencyKey: string;

      items: {
        productId: string;
        quantity: number;
      }[];

      shippingAddress:
        IShippingAddress;

      paymentMethod:
        | "cod"
        | "card";

      notes?: string;
    }
  ) => {
    const idempotencyKey =
      payload.idempotencyKey
        .trim();

    if (
      !idempotencyKey
    ) {
      throw new AppError(
        400,
        "Checkout request key is required"
      );
    }

    /* ========================================================
       FIRST IDEMPOTENCY CHECK
    ======================================================== */

    const existingOrder =
      await Order.findOne(
        {
          customerId:
            customer.id,

          idempotencyKey,
        }
      );

    if (
      existingOrder
    ) {
      return existingOrder;
    }

    if (
      !Array.isArray(
        payload.items
      ) ||
      payload.items.length ===
        0
    ) {
      throw new AppError(
        400,
        "Order must contain at least one product"
      );
    }

    /* ========================================================
       MERGE DUPLICATE PRODUCT IDS
    ======================================================== */

    const quantityMap =
      new Map<
        string,
        number
      >();

    for (
      const item of
        payload.items
    ) {
      if (
        !isValidObjectId(
          item.productId
        )
      ) {
        throw new AppError(
          400,
          `Invalid product ID: ${item.productId}`
        );
      }

      if (
        !Number.isInteger(
          item.quantity
        ) ||
        item.quantity <=
          0
      ) {
        throw new AppError(
          400,
          "Product quantity must be a positive integer"
        );
      }

      quantityMap.set(
        item.productId,
        (
          quantityMap.get(
            item.productId
          ) ||
          0
        ) +
          item.quantity
      );
    }

    const normalizedItems =
      Array.from(
        quantityMap.entries()
      ).map(
        (
          [
            productId,
            quantity,
          ]
        ) => ({
          productId,
          quantity,
        })
      );

    const productIds =
      normalizedItems.map(
        (
          item
        ) =>
          item.productId
      );

    /* ========================================================
       LOAD PRODUCTS
    ======================================================== */

    const products =
      await Product.find(
        {
          _id: {
            $in:
              productIds,
          },

          isDeleted: {
            $ne:
              true,
          },

          status:
            "available",
        }
      );

    if (
      products.length !==
      productIds.length
    ) {
      throw new AppError(
        400,
        "One or more products are unavailable"
      );
    }

    const productMap =
      new Map(
        products.map(
          (
            product
          ) => [
            String(
              product._id
            ),

            product,
          ]
        )
      );

    const commissionRate =
      getCommissionRate();

    const orderItems:
      IOrderItem[] =
      [];

    /* ========================================================
       BUILD ORDER ITEMS
    ======================================================== */

    for (
      const cartItem of
        normalizedItems
    ) {
      const product =
        productMap.get(
          cartItem.productId
        );

      if (
        !product
      ) {
        throw new AppError(
          404,
          "Product not found"
        );
      }

      if (
        cartItem.quantity >
        Number(
          product.quantity
        )
      ) {
        throw new AppError(
          400,
          `${product.title} has only ${product.quantity} ${product.unit} available`
        );
      }

      const sellerId =
        String(
          product.sellerId ||
            ""
        ).trim();

      if (
        !sellerId
      ) {
        throw new AppError(
          400,
          `Product "${product.title}" does not have a valid seller`
        );
      }

      const price =
        Number(
          product.price
        );

      const itemSubtotal =
        Number(
          (
            price *
            cartItem.quantity
          ).toFixed(
            2
          )
        );

      orderItems.push(
        {
          productId:
            String(
              product._id
            ),

          title:
            product.title,

          image:
            product.images?.[
              0
            ],

          sellerId,

          sellerName:
            product.sellerName ||
            "AgriNova Seller",

          sellerEmail:
            (
              product.sellerEmail ||
              ""
            )
              .trim()
              .toLowerCase(),

          quantity:
            cartItem.quantity,

          unit:
            product.unit,

          price,

          subtotal:
            itemSubtotal,
        }
      );
    }

    /* ========================================================
       GROUP BY SELLER
    ======================================================== */

    const grouped =
      new Map<
        string,
        IOrderFulfillment
      >();

    for (
      const item of
        orderItems
    ) {
      const sellerKey =
        item.sellerId;

      const existing =
        grouped.get(
          sellerKey
        );

      if (
        existing
      ) {
        existing.items.push(
          item
        );

        existing.subtotal =
          Number(
            (
              existing.subtotal +
              item.subtotal
            ).toFixed(
              2
            )
          );

        continue;
      }

      grouped.set(
        sellerKey,
        {
          sellerId:
            sellerKey,

          sellerName:
            item.sellerName,

          sellerEmail:
            item.sellerEmail,

          items: [
            item,
          ],

          subtotal:
            Number(
              item.subtotal.toFixed(
                2
              )
            ),

          /**
           * One delivery fee per seller.
           */
          deliveryFee:
            getDeliveryFee(),

          commissionRate,

          commissionAmount:
            0,

          sellerPayout:
            0,

          status:
            "pending",
        }
      );
    }

    const fulfillments =
      Array.from(
        grouped.values()
      );

    if (
      fulfillments.length ===
      0
    ) {
      throw new AppError(
        400,
        "Order does not contain any valid seller"
      );
    }

    /* ========================================================
       CALCULATIONS
    ======================================================== */

    let subtotal =
      0;

    let deliveryFee =
      0;

    let commissionAmount =
      0;

    let sellerPayoutAmount =
      0;

    for (
      const fulfillment of
        fulfillments
    ) {
      const commission =
        Number(
          (
            fulfillment.subtotal *
            commissionRate /
            100
          ).toFixed(
            2
          )
        );

      const payout =
        Number(
          (
            fulfillment.subtotal -
            commission
          ).toFixed(
            2
          )
        );

      fulfillment.commissionAmount =
        commission;

      fulfillment.sellerPayout =
        payout;

      subtotal +=
        fulfillment.subtotal;

      deliveryFee +=
        Number(
          fulfillment.deliveryFee ||
            0
        );

      commissionAmount +=
        commission;

      sellerPayoutAmount +=
        payout;
    }

    subtotal =
      Number(
        subtotal.toFixed(
          2
        )
      );

    deliveryFee =
      Number(
        deliveryFee.toFixed(
          2
        )
      );

    commissionAmount =
      Number(
        commissionAmount.toFixed(
          2
        )
      );

    sellerPayoutAmount =
      Number(
        sellerPayoutAmount.toFixed(
          2
        )
      );

    const totalAmount =
      Number(
        (
          subtotal +
          deliveryFee
        ).toFixed(
          2
        )
      );

    /* ========================================================
       TRANSACTION
    ======================================================== */

    const session =
      await Product.startSession();

    try {
      let createdOrder:
        any =
        null;

      await session.withTransaction(
        async () => {
          /* ==================================================
             SECOND IDEMPOTENCY CHECK
          ================================================== */

          const duplicate =
            await Order.findOne(
              {
                customerId:
                  customer.id,

                idempotencyKey,
              }
            ).session(
              session
            );

          if (
            duplicate
          ) {
            createdOrder =
              duplicate;

            return;
          }

          /* ==================================================
             ATOMIC STOCK DEDUCTION
          ================================================== */

          for (
            const cartItem of
              normalizedItems
          ) {
            const updated =
              await Product.findOneAndUpdate(
                {
                  _id:
                    cartItem.productId,

                  isDeleted: {
                    $ne:
                      true,
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
                  new:
                    true,

                  session,

                  runValidators:
                    true,
                }
              );

            if (
              !updated
            ) {
              throw new AppError(
                409,
                "Product stock changed. Please refresh your cart and try again."
              );
            }

            if (
              Number(
                updated.quantity
              ) <=
              0
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

          /* ==================================================
             CREATE ORDER
          ================================================== */

          const created =
            await Order.create(
              [
                {
                  idempotencyKey,

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
                    "pending",

                  stockRestored:
                    false,

                  notes:
                    payload.notes,
                },
              ],

              {
                session,
              }
            );

          createdOrder =
            created[
              0
            ];
        }
      );

      if (
        createdOrder
      ) {
        return createdOrder;
      }

      throw new AppError(
        500,
        "Order could not be created"
      );
    } catch (
      error:
        any
    ) {
      /**
       * Two identical requests can arrive at almost
       * the same time.
       *
       * Unique index makes only one survive.
       */
      if (
        error?.code ===
        11000
      ) {
        const duplicate =
          await Order.findOne(
            {
              customerId:
                customer.id,

              idempotencyKey,
            }
          );

        if (
          duplicate
        ) {
          return duplicate;
        }
      }

      throw error;
    } finally {
      await session.endSession();
    }
  };

/* ============================================================
   2B - BUYER MY ORDERS + PAGINATION
============================================================ */

const getMyOrdersFromDB =
  async (
    customerId:
      string,

    query: {
      page?: string;
      limit?: string;
    } = {}
  ) => {
    const page =
      Math.max(
        Number(
          query.page
        ) ||
          1,
        1
      );

    const limit =
      Math.min(
        Math.max(
          Number(
            query.limit
          ) ||
            10,
          1
        ),
        50
      );

    const skip =
      (
        page -
        1
      ) *
      limit;

    const [
      data,
      total,
    ] =
      await Promise.all(
        [
          Order.find(
            {
              customerId,
            }
          )
            .sort(
              {
                createdAt:
                  -1,
              }
            )
            .skip(
              skip
            )
            .limit(
              limit
            )
            .lean(),

          Order.countDocuments(
            {
              customerId,
            }
          ),
        ]
      );

    return {
      meta: {
        page,

        limit,

        total,

        totalPages:
          Math.max(
            Math.ceil(
              total /
                limit
            ),
            1
          ),
      },

      data,
    };
  };

/* ============================================================
   BUYER - GET ONE ORDER
============================================================ */

const getMyOrderByIdFromDB =
  async (
    orderId:
      string,

    customerId:
      string
  ) => {
    if (
      !isValidObjectId(
        orderId
      )
    ) {
      throw new AppError(
        400,
        "Invalid order ID"
      );
    }

    const order =
      await Order.findOne(
        {
          _id:
            orderId,

          customerId,
        }
      ).lean();

    if (
      !order
    ) {
      throw new AppError(
        404,
        "Order not found"
      );
    }

    return order;
  };

/* ============================================================
   SELLER - GET OWN ORDERS
============================================================ */

const getSellerOrdersFromDB =
  async (
    sellerId:
      string,

    sellerEmail:
      string
  ) => {
    const normalizedEmail =
      sellerEmail
        .trim()
        .toLowerCase();

    const orders =
      await Order.find(
        {
          $or: [
            {
              "fulfillments.sellerId":
                sellerId,
            },

            {
              "fulfillments.sellerEmail":
                normalizedEmail,
            },
          ],
        }
      )
        .sort(
          {
            createdAt:
              -1,
          }
        )
        .lean();

    /**
     * Never return other sellers'
     * fulfillment data to this seller.
     */
    return orders.map(
      (
        order
      ) => ({
        ...order,

        fulfillments:
          order.fulfillments.filter(
            (
              fulfillment
            ) =>
              fulfillment.sellerId ===
                sellerId ||
              fulfillment.sellerEmail ===
                normalizedEmail
          ),
      })
    );
  };

/* ============================================================
   SELLER - UPDATE OWN FULFILLMENT
============================================================ */

const updateSellerFulfillment =
  async (
    orderId:
      string,

    sellerId:
      string,

    sellerEmail:
      string,

    status:
      any
  ) => {
    const SELLER_ALLOWED_STATUSES =
      [
        "confirmed",
        "processing",
        "ready_for_pickup",
      ] as const;

    if (
      !SELLER_ALLOWED_STATUSES.includes(
        status
      )
    ) {
      throw new AppError(
        400,
        "Seller can only update fulfillment to confirmed, processing, or ready_for_pickup"
      );
    }

    if (
      !isValidObjectId(
        orderId
      )
    ) {
      throw new AppError(
        400,
        "Invalid order ID"
      );
    }

    const normalizedEmail =
      sellerEmail
        .trim()
        .toLowerCase();

    const order =
      await Order.findOne(
        {
          _id:
            orderId,

          $or: [
            {
              "fulfillments.sellerId":
                sellerId,
            },

            {
              "fulfillments.sellerEmail":
                normalizedEmail,
            },
          ],
        }
      );

    if (
      !order
    ) {
      throw new AppError(
        404,
        "Order not found"
      );
    }

    const fulfillment =
      order.fulfillments.find(
        (
          item
        ) =>
          item.sellerId ===
            sellerId ||
          item.sellerEmail ===
            normalizedEmail
      );

    if (
      !fulfillment
    ) {
      throw new AppError(
        403,
        "You are not a seller in this order"
      );
    }

    const allowedNextStatuses:
      Record<
        string,
        string[]
      > = {
        pending: [
          "confirmed",
        ],

        confirmed: [
          "processing",
        ],

        processing: [
          "ready_for_pickup",
        ],

        ready_for_pickup:
          [],
      };

    if (
      !allowedNextStatuses[
        fulfillment.status
      ]?.includes(
        status
      )
    ) {
      throw new AppError(
        400,
        `Invalid status transition: ${fulfillment.status} → ${status}`
      );
    }

    fulfillment.status =
      status;

    recalculateOrderStatus(
      order
    );

    await order.save();

    return order;
  };

/* ============================================================
   ADMIN - UPDATE SELLER DELIVERY
============================================================ */

const updateAdminFulfillment =
  async (
    orderId:
      string,

    sellerId:
      string,

    status:
      any,

    deliveryPartner?: {
      name?: string;
      phone?: string;
    }
  ) => {
    if (
      !isValidObjectId(
        orderId
      )
    ) {
      throw new AppError(
        400,
        "Invalid order ID"
      );
    }

    const ADMIN_DELIVERY_STATUSES =
      [
        "picked_up",
        "out_for_delivery",
        "delivered",
      ] as const;

    if (
      !ADMIN_DELIVERY_STATUSES.includes(
        status
      )
    ) {
      throw new AppError(
        400,
        "Admin delivery status must be picked_up, out_for_delivery, or delivered"
      );
    }

    const order =
      await Order.findById(
        orderId
      );

    if (
      !order
    ) {
      throw new AppError(
        404,
        "Order not found"
      );
    }

    const fulfillment =
      order.fulfillments.find(
        (
          item
        ) =>
          item.sellerId ===
          sellerId
      );

    if (
      !fulfillment
    ) {
      throw new AppError(
        404,
        "Seller fulfillment not found"
      );
    }

    const allowedNextStatuses:
      Record<
        string,
        string[]
      > = {
        ready_for_pickup:
          [
            "picked_up",
          ],

        picked_up: [
          "out_for_delivery",
        ],

        out_for_delivery:
          [
            "delivered",
          ],
      };

    if (
      !allowedNextStatuses[
        fulfillment.status
      ]?.includes(
        status
      )
    ) {
      throw new AppError(
        400,
        `Invalid delivery status transition: ${fulfillment.status} → ${status}`
      );
    }

    fulfillment.status =
      status;

    if (
      deliveryPartner
    ) {
      fulfillment.deliveryPartner =
        {
          ...(deliveryPartner.name
            ? {
                name:
                  deliveryPartner.name,
              }
            : {}),

          ...(deliveryPartner.phone
            ? {
                phone:
                  deliveryPartner.phone,
              }
            : {}),
        };
    }

    recalculateOrderStatus(
      order
    );

    await order.save();

    return order;
  };

/* ============================================================
   2C - ADMIN GET ALL ORDERS + PAGINATION/FILTERING
============================================================ */

const getAllOrdersForAdmin =
  async (
    query: Record<
      string,
      unknown
    > = {}
  ) => {
    const page =
      Math.max(
        Number(
          query.page
        ) ||
          1,
        1
      );

    const limit =
      Math.min(
        Math.max(
          Number(
            query.limit
          ) ||
            20,
          1
        ),
        100
      );

    const skip =
      (
        page -
        1
      ) *
      limit;

    const filter:
      Record<
        string,
        any
      > = {};

    /* ========================================================
       ORDER STATUS FILTER
    ======================================================== */

    if (
      typeof query.status ===
        "string" &&
      query.status.trim()
    ) {
      filter.status =
        query.status
          .trim();
    }

    /* ========================================================
       PAYMENT STATUS FILTER
    ======================================================== */

    if (
      typeof query.paymentStatus ===
        "string" &&
      query.paymentStatus
        .trim()
    ) {
      filter.paymentStatus =
        query.paymentStatus
          .trim();
    }

    /* ========================================================
       PAYMENT METHOD FILTER
    ======================================================== */

    if (
      typeof query.paymentMethod ===
        "string" &&
      query.paymentMethod
        .trim()
    ) {
      filter.paymentMethod =
        query.paymentMethod
          .trim();
    }

    /* ========================================================
       FULFILLMENT FILTER
    ======================================================== */

    if (
      typeof query.fulfillmentStatus ===
        "string" &&
      query.fulfillmentStatus
        .trim()
    ) {
      if (
        query.fulfillmentStatus ===
        "active"
      ) {
        filter[
          "fulfillments.status"
        ] = {
          $in: [
            "ready_for_pickup",
            "picked_up",
            "out_for_delivery",
          ],
        };
      } else {
        filter[
          "fulfillments.status"
        ] =
          query.fulfillmentStatus;
      }
    }

    /* ========================================================
       SEARCH
    ======================================================== */

    if (
      typeof query.search ===
        "string" &&
      query.search.trim()
    ) {
      const escaped =
        query.search
          .trim()
          .replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          );

      const regex =
        new RegExp(
          escaped,
          "i"
        );

      filter.$or = [
        {
          orderNumber:
            regex,
        },

        {
          customerName:
            regex,
        },

        {
          customerEmail:
            regex,
        },

        {
          "shippingAddress.phone":
            regex,
        },

        {
          "fulfillments.sellerName":
            regex,
        },

        {
          "fulfillments.sellerEmail":
            regex,
        },

        {
          "items.title":
            regex,
        },
      ];
    }

    /* ========================================================
       DATA
    ======================================================== */

    const [
      data,
      total,
    ] =
      await Promise.all(
        [
          Order.find(
            filter
          )
            .sort(
              {
                createdAt:
                  -1,
              }
            )
            .skip(
              skip
            )
            .limit(
              limit
            )
            .lean(),

          Order.countDocuments(
            filter
          ),
        ]
      );

    return {
      meta: {
        page,

        limit,

        total,

        totalPages:
          Math.max(
            Math.ceil(
              total /
                limit
            ),
            1
          ),
      },

      data,
    };
  };

/* ============================================================
   ADMIN - UPDATE MASTER ORDER STATUS
============================================================ */

const updateOrderStatusByAdmin =
  async (
    orderId:
      string,

    status:
      any
  ) => {
    if (
      !isValidObjectId(
        orderId
      )
    ) {
      throw new AppError(
        400,
        "Invalid order ID"
      );
    }

    const order =
      await Order.findById(
        orderId
      );

    if (
      !order
    ) {
      throw new AppError(
        404,
        "Order not found"
      );
    }

    /**
     * Prevent reopening terminal orders accidentally.
     */
    if (
      order.status ===
        "delivered" &&
      status !==
        "delivered"
    ) {
      throw new AppError(
        400,
        "Delivered order status cannot be changed"
      );
    }

    order.status =
      status;

    await order.save();

    return order;
  };

/* ============================================================
   EXPORT
============================================================ */

export const OrderService =
  {
    /**
     * Required by current order.controller.ts
     */
    getCheckoutConfig,

    createOrderInDB,

    /**
     * Returns:
     * {
     *   meta,
     *   data
     * }
     */
    getMyOrdersFromDB,

    getMyOrderByIdFromDB,

    getSellerOrdersFromDB,

    updateSellerFulfillment,

    updateAdminFulfillment,

    getAllOrdersForAdmin,

    updateOrderStatusByAdmin,
  };