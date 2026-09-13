import mongoose, {
  ClientSession,
  isValidObjectId,
} from "mongoose";

import AppError from "../../utils/AppError";
import { Product } from "../product/product.model";
import { NotificationService } from "../notification/notification.service";
import { Order } from "./order.model";

import {
  IOrderItem,
  IOrderFulfillment,
  IShippingAddress,
} from "./order.interface";

const getAuthUserCollection = () =>
  mongoose.connection
    .useDb("AgriNove-auth", {
      useCache: true,
    })
    .collection("user");

const normalizeEmail = (
  value?: string
) =>
  String(value || "")
    .trim()
    .toLowerCase();

const getOwnedProductIds =
  async (
    orders: any[],
    sellerId: string,
    sellerEmail: string
  ) => {
    const productIds =
      Array.from(
        new Set(
          orders
            .flatMap((order) =>
              (
                order.fulfillments ||
                []
              ).flatMap(
                (
                  fulfillment: any
                ) =>
                  (
                    fulfillment.items ||
                    []
                  ).map(
                    (item: any) =>
                      String(
                        item.productId ||
                          ""
                      )
                  )
              )
            )
            .filter(Boolean)
        )
      );

    if (!productIds.length) {
      return new Set<string>();
    }

    const normalizedEmail =
      normalizeEmail(
        sellerEmail
      );

    const products =
      await Product.find({
        _id: {
          $in: productIds,
        },

        $or: [
          {
            sellerId,
          },

          {
            $and: [
              {
                $or: [
                  {
                    sellerId: {
                      $exists:
                        false,
                    },
                  },

                  {
                    sellerId:
                      null,
                  },

                  {
                    sellerId:
                      "",
                  },
                ],
              },

              {
                sellerEmail:
                  normalizedEmail,
              },
            ],
          },
        ],
      })
        .select("_id")
        .lean();

    return new Set(
      products.map(
        (product) =>
          String(
            product._id
          )
      )
    );
  };

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

const getCheckoutConfig =
  () => ({
    deliveryFee:
      getDeliveryFee(),
  });

const generateOrderNumber =
  () => {
    const timestamp =
      Date.now()
        .toString()
        .slice(-8);

    const random =
      Math.floor(
        1000 +
          Math.random() *
            9000
      );

    return `AN-${timestamp}-${random}`;
  };

const toBuyerOrderView = (
  order: any
) => {
  const plain =
    typeof order?.toObject ===
    "function"
      ? order.toObject()
      : order;

  return {
    ...plain,

    items: (
      plain.items || []
    ).map((item: any) => {
      const {
        sellerEmail:
          _sellerEmail,
        ...safeItem
      } = item;

      return safeItem;
    }),

    fulfillments: (
      plain.fulfillments ||
      []
    ).map(
      (
        fulfillment: any
      ) => {
        const {
          sellerEmail:
            _sellerEmail,
          ...safeFulfillment
        } = fulfillment;

        return {
          ...safeFulfillment,

          items: (
            fulfillment.items ||
            []
          ).map(
            (item: any) => {
              const {
                sellerEmail:
                  _itemSellerEmail,
                ...safeItem
              } = item;

              return safeItem;
            }
          ),
        };
      }
    ),
  };
};

const matchesSellerIdentity =
  (
    fulfillment: any,
    sellerId: string,
    sellerEmail: string
  ) => {
    const fulfillmentSellerId =
      String(
        fulfillment?.sellerId ||
          ""
      );

    if (
      fulfillmentSellerId
    ) {
      return (
        fulfillmentSellerId ===
        sellerId
      );
    }

    return (
      String(
        fulfillment?.sellerEmail ||
          ""
      )
        .trim()
        .toLowerCase() ===
      sellerEmail
        .trim()
        .toLowerCase()
    );
  };

const sellerOrderIdentityQuery =
  (
    sellerId: string,
    sellerEmail: string
  ) => {
    const normalizedEmail =
      normalizeEmail(
        sellerEmail
      );

    return {
      $or: [
        {
          "fulfillments.sellerId":
            sellerId,
        },

        {
          "fulfillments.items.sellerId":
            sellerId,
        },

        {
          fulfillments: {
            $elemMatch: {
              $and: [
                {
                  $or: [
                    {
                      sellerId: {
                        $exists:
                          false,
                      },
                    },

                    {
                      sellerId:
                        null,
                    },

                    {
                      sellerId:
                        "",
                    },

                    {
                      sellerId:
                        "unknown-seller",
                    },
                  ],
                },

                {
                  sellerEmail:
                    normalizedEmail,
                },
              ],
            },
          },
        },

        {
          fulfillments: {
            $elemMatch: {
              items: {
                $elemMatch: {
                  $and: [
                    {
                      $or: [
                        {
                          sellerId:
                            {
                              $exists:
                                false,
                            },
                        },

                        {
                          sellerId:
                            null,
                        },

                        {
                          sellerId:
                            "",
                        },

                        {
                          sellerId:
                            "unknown-seller",
                        },
                      ],
                    },

                    {
                      sellerEmail:
                        normalizedEmail,
                    },
                  ],
                },
              },
            },
          },
        },
      ],
    };
  };

const itemBelongsToSeller =
  (
    item: any,
    sellerId: string,
    sellerEmail: string,
    ownedProductIds?: Set<string>
  ) => {
    const productId =
      String(
        item?.productId ||
          ""
      );

    if (
      ownedProductIds?.has(
        productId
      )
    ) {
      return true;
    }

    const itemSellerId =
      String(
        item?.sellerId ||
          ""
      ).trim();

    if (
      itemSellerId &&
      itemSellerId !==
        "unknown-seller"
    ) {
      return (
        itemSellerId ===
        sellerId
      );
    }

    return (
      normalizeEmail(
        item?.sellerEmail
      ) ===
      normalizeEmail(
        sellerEmail
      )
    );
  };

const toSellerOrderView =
  (
    order: any,
    sellerId: string,
    sellerEmail: string,
    ownedProductIds?: Set<string>
  ) => {
    const plain =
      typeof order?.toObject ===
      "function"
        ? order.toObject()
        : order;

    const sellerParts = (
      plain.fulfillments ||
      []
    )
      .map(
        (
          fulfillment: any
        ) => {
          const ownedItems =
            (
              fulfillment.items ||
              []
            ).filter(
              (item: any) =>
                itemBelongsToSeller(
                  item,
                  sellerId,
                  sellerEmail,
                  ownedProductIds
                )
            );

          if (
            !ownedItems.length
          ) {
            return null;
          }

          return {
            fulfillment,
            ownedItems,
          };
        }
      )
      .filter(Boolean) as {
      fulfillment: any;
      ownedItems: any[];
    }[];

    if (!sellerParts.length) {
      return null;
    }

    const safeItems =
      sellerParts.flatMap(
        ({
          ownedItems,
        }) =>
          ownedItems.map(
            (item: any) => ({
              productId:
                item.productId,

              title:
                item.title,

              image:
                item.image,

              quantity:
                item.quantity,

              unit:
                item.unit,

              price:
                item.price,

              subtotal:
                item.subtotal,
            })
          )
      );

    const subtotal =
      Number(
        safeItems
          .reduce(
            (
              sum,
              item
            ) =>
              sum +
              Number(
                item.subtotal ||
                  0
              ),
            0
          )
          .toFixed(2)
      );

    const firstFulfillment =
      sellerParts[0]
        .fulfillment;

    const commissionRate =
      Number(
        firstFulfillment.commissionRate ||
          0
      );

    const commissionAmount =
      Number(
        (
          (subtotal *
            commissionRate) /
          100
        ).toFixed(2)
      );

    const sellerPayout =
      Number(
        (
          subtotal -
          commissionAmount
        ).toFixed(2)
      );

    return {
      _id: String(
        plain._id
      ),

      orderNumber:
        plain.orderNumber,

      customerName:
        plain.customerName,

      deliveryDistrict:
        plain
          .shippingAddress
          ?.district || "",

      paymentMethod:
        plain.paymentMethod,

      paymentStatus:
        plain.paymentStatus,

      status:
        plain.status,

      createdAt:
        plain.createdAt,

      updatedAt:
        plain.updatedAt,

      fulfillment: {
        sellerId,

        sellerName:
          firstFulfillment.sellerName,

        items:
          safeItems,

        subtotal,

        commissionRate,

        commissionAmount,

        sellerPayout,

        status:
          firstFulfillment.status,

        pickupAddress:
          firstFulfillment.pickupAddress,

        deliveryPartner:
          firstFulfillment.deliveryPartner,
      },
    };
  };

const notifyNewOrderSellers =
  async (
    order: any
  ) => {
    const notifications =
      (
        order.fulfillments ||
        []
      )
        .filter(
          (
            fulfillment: any
          ) =>
            fulfillment.sellerId
        )
        .map(
          (
            fulfillment: any
          ) => ({
            userId:
              String(
                fulfillment.sellerId
              ),

            type:
              "MARKETPLACE_NEW_ORDER" as const,

            title:
              "New marketplace order",

            message: `You received a new order (${order.orderNumber}) for ${fulfillment.items.length} item${fulfillment.items.length === 1 ? "" : "s"}.`,

            href:
              "/seller-orders",

            data: {
              orderId:
                String(
                  order._id
                ),

              orderNumber:
                order.orderNumber,
            },
          })
        );

    if (
      notifications.length
    ) {
      await NotificationService.createManyNotifications(
        notifications
      );
    }
  };

const notifyAdminsReadyForPickup =
  async (
    order: any,
    fulfillment: any
  ) => {
    const admins =
      await getAuthUserCollection()
        .find({
          role:
            "ADMIN",

          status: {
            $nin: [
              "BLOCKED",
              "REJECTED",
              "PENDING",
            ],
          },
        })
        .project({
          _id: 1,
        })
        .toArray();

    if (!admins.length) {
      return;
    }

    await NotificationService.createManyNotifications(
      admins.map(
        (admin) => ({
          userId:
            String(
              admin._id
            ),

          type:
            "MARKETPLACE_READY_FOR_PICKUP" as const,

          title:
            "Marketplace pickup ready",

          message: `${fulfillment.sellerName} marked order ${order.orderNumber} ready for pickup.`,

          href:
            "/dashboard/admin/marketplace?tab=fulfillment",

          data: {
            orderId:
              String(
                order._id
              ),

            orderNumber:
              order.orderNumber,

            sellerId:
              fulfillment.sellerId,
          },
        })
      )
    );
  };

const createOrderInDB =
  async (
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

      shippingAddress:
        IShippingAddress;

      paymentMethod:
        | "cod"
        | "card";

      notes?: string;
    }
  ) => {
    const productIds =
      payload.items.map(
        (item) =>
          item.productId
      );

    const uniqueProductIds =
      [
        ...new Set(
          productIds
        ),
      ];

    for (
      const id of
      uniqueProductIds
    ) {
      if (
        !isValidObjectId(
          id
        )
      ) {
        throw new AppError(
          400,
          `Invalid product ID: ${id}`
        );
      }
    }

    const products =
      await Product.find({
        _id: {
          $in:
            uniqueProductIds,
        },

        isDeleted: {
          $ne: true,
        },

        status:
          "available",
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
      IOrderItem[] = [];

    const normalizedCustomerEmail =
      normalizeEmail(
        customer.email
      );

    const legacySellerEmails =
      Array.from(
        new Set(
          products
            .filter(
              (product) =>
                !String(
                  product.sellerId ||
                    ""
                ).trim()
            )
            .map((product) =>
              normalizeEmail(
                product.sellerEmail
              )
            )
            .filter(Boolean)
        )
      );

    const legacySellerMap =
      new Map<
        string,
        {
          id: string;
          name?: string;
        }
      >();

    if (
      legacySellerEmails.length
    ) {
      const legacyUsers =
        await getAuthUserCollection()
          .find({
            email: {
              $in:
                legacySellerEmails,
            },
          })
          .project({
            _id: 1,
            email: 1,
            name: 1,
          })
          .toArray();

      legacyUsers.forEach(
        (user: any) => {
          legacySellerMap.set(
            normalizeEmail(
              user.email
            ),
            {
              id: String(
                user._id
              ),

              name:
                typeof user.name ===
                "string"
                  ? user.name
                  : undefined,
            }
          );
        }
      );
    }

    const sellerBackfills: {
      productId: string;
      sellerId: string;
    }[] = [];

    for (
      const cartItem of
      payload.items
    ) {
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

      const productSellerEmail =
        normalizeEmail(
          product.sellerEmail
        );

      let resolvedSellerId =
        String(
          product.sellerId ||
            ""
        ).trim();

      if (
        !resolvedSellerId &&
        productSellerEmail
      ) {
        const legacySeller =
          legacySellerMap.get(
            productSellerEmail
          );

        if (
          legacySeller?.id
        ) {
          resolvedSellerId =
            legacySeller.id;

          sellerBackfills.push(
            {
              productId:
                String(
                  product._id
                ),

              sellerId:
                legacySeller.id,
            }
          );
        }
      }

      if (
        !resolvedSellerId
      ) {
        throw new AppError(
          409,
          `The seller account for "${product.title}" could not be verified. Please remove this item from the cart and contact AgriNova support.`
        );
      }

      const isOwnProduct =
        resolvedSellerId ===
          customer.id ||
        Boolean(
          productSellerEmail &&
            productSellerEmail ===
              normalizedCustomerEmail
        );

      if (isOwnProduct) {
        throw new AppError(
          400,
          `You cannot buy your own marketplace listing: ${product.title}`
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
        Number(
          product.price
        );

      const subtotal =
        price *
        cartItem.quantity;

      orderItems.push({
        productId:
          String(
            product._id
          ),

        title:
          product.title,

        image:
          product.images?.[0],

        sellerId:
          resolvedSellerId,

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

    if (
      sellerBackfills.length
    ) {
      await Product.bulkWrite(
        sellerBackfills.map(
          ({
            productId,
            sellerId,
          }) => ({
            updateOne: {
              filter: {
                _id:
                  productId,

                $or: [
                  {
                    sellerId: {
                      $exists:
                        false,
                    },
                  },

                  {
                    sellerId:
                      null,
                  },

                  {
                    sellerId:
                      "",
                  },
                ],
              },

              update: {
                $set: {
                  sellerId,
                },
              },
            },
          })
        )
      );
    }

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
        item.sellerId?.trim();

      if (!sellerKey) {
        throw new AppError(
          400,
          `Product "${item.title}" does not have a valid seller`
        );
      }

      const existing =
        grouped.get(
          sellerKey
        );

      if (existing) {
        existing.items.push(
          item
        );

        existing.subtotal =
          Number(
            (
              existing.subtotal +
              item.subtotal
            ).toFixed(2)
          );

        continue;
      }

      const sourceProduct =
        productMap.get(
          item.productId
        );

      grouped.set(
        sellerKey,
        {
          sellerId:
            sellerKey,

          sellerName:
            item.sellerName,

          sellerEmail:
            item.sellerEmail
              .trim()
              .toLowerCase(),

          items: [
            item,
          ],

          subtotal:
            Number(
              item.subtotal.toFixed(
                2
              )
            ),

          commissionRate,

          commissionAmount:
            0,

          sellerPayout:
            0,

          status:
            "pending",

          pickupAddress:
            [
              sourceProduct?.location,
              sourceProduct?.upazila,
              sourceProduct?.district,
              sourceProduct?.division,
            ]
              .filter(
                Boolean
              )
              .join(", ") ||
            undefined,
        }
      );
    }

    const fulfillments =
      [
        ...grouped.values(),
      ];

    let subtotal = 0;
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
            (fulfillment.subtotal *
              commissionRate) /
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
          for (
            const cartItem of
            payload.items
          ) {
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
                    "pending",

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

      if (
        createdOrder &&
        createdOrder.paymentMethod ===
          "cod"
      ) {
        await notifyNewOrderSellers(
          createdOrder
        );
      }

      return createdOrder;
    } finally {
      await session.endSession();
    }
  };

const getMyOrdersFromDB =
  async (
    customerId: string,

    query: {
      page?: string;
      limit?: string;
    } = {}
  ) => {
    const page =
      Math.max(
        Number(
          query.page
        ) || 1,
        1
      );

    const limit =
      Math.min(
        Math.max(
          Number(
            query.limit
          ) || 10,
          1
        ),
        50
      );

    const skip =
      (page - 1) *
      limit;

    const [
      orders,
      total,
    ] =
      await Promise.all([
        Order.find({
          customerId,
        })
          .sort({
            createdAt: -1,
          })
          .skip(skip)
          .limit(limit)
          .lean(),

        Order.countDocuments({
          customerId,
        }),
      ]);

    return {
      meta: {
        page,
        limit,
        total,

        totalPages:
          Math.max(
            Math.ceil(
              total / limit
            ),
            1
          ),
      },

      data:
        orders.map(
          toBuyerOrderView
        ),
    };
  };

const getMyOrderByIdFromDB =
  async (
    orderId: string,
    customerId: string
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
      await Order.findOne({
        _id:
          orderId,

        customerId,
      }).lean();

    if (!order) {
      throw new AppError(
        404,
        "Order not found"
      );
    }

    return toBuyerOrderView(
      order
    );
  };

const getSellerOrdersFromDB =
  async (
    sellerId: string,
    sellerEmail: string
  ) => {
    const normalizedEmail =
      sellerEmail
        .trim()
        .toLowerCase();

    const orders =
      await Order.find({
        $and: [
          sellerOrderIdentityQuery(
            sellerId,
            normalizedEmail
          ),

          {
            $or: [
              {
                paymentMethod:
                  "cod",
              },

              {
                paymentMethod:
                  "card",

                paymentStatus:
                  "paid",
              },
            ],
          },
        ],
      })
        .sort({
          createdAt: -1,
        })
        .lean();

    const ownedProductIds =
      await getOwnedProductIds(
        orders,
        sellerId,
        normalizedEmail
      );

    return orders
      .map((order) =>
        toSellerOrderView(
          order,
          sellerId,
          normalizedEmail,
          ownedProductIds
        )
      )
      .filter(Boolean);
  };

const updateSellerFulfillment =
  async (
    orderId: string,
    sellerId: string,
    sellerEmail: string,
    status: any
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
      await Order.findOne({
        _id:
          orderId,

        $and: [
          sellerOrderIdentityQuery(
            sellerId,
            normalizedEmail
          ),

          {
            $or: [
              {
                paymentMethod:
                  "cod",
              },

              {
                paymentMethod:
                  "card",

                paymentStatus:
                  "paid",
              },
            ],
          },
        ],
      });

    if (!order) {
      throw new AppError(
        404,
        "Order not found"
      );
    }

    const ownedProductIds =
      await getOwnedProductIds(
        [
          order.toObject(),
        ],
        sellerId,
        normalizedEmail
      );

    const fulfillment =
      order.fulfillments.find(
        (item: any) =>
          matchesSellerIdentity(
            item,
            sellerId,
            normalizedEmail
          ) ||
          (
            item.items ||
            []
          ).some(
            (
              orderItem: any
            ) =>
              itemBelongsToSeller(
                orderItem,
                sellerId,
                normalizedEmail,
                ownedProductIds
              )
          )
      );

    if (!fulfillment) {
      throw new AppError(
        403,
        "You are not a seller in this order"
      );
    }

    const containsAnotherSellerItem =
      (
        fulfillment.items ||
        []
      ).some(
        (
          orderItem: any
        ) =>
          !itemBelongsToSeller(
            orderItem,
            sellerId,
            normalizedEmail,
            ownedProductIds
          )
      );

    if (
      containsAnotherSellerItem
    ) {
      throw new AppError(
        409,
        "This legacy order contains products from multiple sellers in one fulfillment. AgriNova must repair the order before its seller status can be changed."
      );
    }

    const currentStatus =
      fulfillment.status;

    const allowedNextStatuses: Record<
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
        currentStatus
      ]?.includes(status)
    ) {
      throw new AppError(
        400,
        `Invalid status transition: ${currentStatus} → ${status}`
      );
    }

    fulfillment.status =
      status;

    const statuses =
      order.fulfillments.map(
        (item) =>
          item.status
      );

    const allDelivered =
      statuses.length > 0 &&
      statuses.every(
        (item) =>
          item ===
          "delivered"
      );

    const anyDelivered =
      statuses.some(
        (item) =>
          item ===
          "delivered"
      );

    const anyOutForDelivery =
      statuses.some(
        (item) =>
          item ===
          "out_for_delivery"
      );

    const anyPickedUp =
      statuses.some(
        (item) =>
          item ===
          "picked_up"
      );

    const allReadyForPickup =
      statuses.length > 0 &&
      statuses.every(
        (item) =>
          item ===
          "ready_for_pickup"
      );

    const anyReadyForPickup =
      statuses.some(
        (item) =>
          item ===
          "ready_for_pickup"
      );

    const anyProcessing =
      statuses.some(
        (item) =>
          item ===
          "processing"
      );

    const anyConfirmed =
      statuses.some(
        (item) =>
          item ===
          "confirmed"
      );

    if (allDelivered) {
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

    await order.save();

    if (
      status ===
      "ready_for_pickup"
    ) {
      await notifyAdminsReadyForPickup(
        order,
        fulfillment
      );
    }

    return toSellerOrderView(
      order,
      sellerId,
      normalizedEmail,
      ownedProductIds
    );
  };

const updateAdminFulfillment =
  async (
    orderId: string,
    sellerId: string,
    status: any,

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

    if (!order) {
      throw new AppError(
        404,
        "Order not found"
      );
    }

    const fulfillment =
      order.fulfillments.find(
        (item) =>
          item.sellerId ===
          sellerId
      );

    if (!fulfillment) {
      throw new AppError(
        404,
        "Seller fulfillment not found"
      );
    }

    const currentStatus =
      fulfillment.status;

    const allowedNextStatuses: Record<
      string,
      string[]
    > = {
      ready_for_pickup: [
        "picked_up",
      ],

      picked_up: [
        "out_for_delivery",
      ],

      out_for_delivery: [
        "delivered",
      ],
    };

    if (
      !allowedNextStatuses[
        currentStatus
      ]?.includes(status)
    ) {
      throw new AppError(
        400,
        `Invalid delivery status transition: ${currentStatus} → ${status}`
      );
    }

    fulfillment.status =
      status;

    if (
      deliveryPartner
    ) {
      fulfillment.deliveryPartner =
        deliveryPartner;
    }

    const statuses =
      order.fulfillments.map(
        (item) =>
          item.status
      );

    const allDelivered =
      statuses.length > 0 &&
      statuses.every(
        (item) =>
          item ===
          "delivered"
      );

    const anyDelivered =
      statuses.some(
        (item) =>
          item ===
          "delivered"
      );

    const anyOutForDelivery =
      statuses.some(
        (item) =>
          item ===
          "out_for_delivery"
      );

    const anyPickedUp =
      statuses.some(
        (item) =>
          item ===
          "picked_up"
      );

    const allReadyForPickup =
      statuses.length > 0 &&
      statuses.every(
        (item) =>
          item ===
          "ready_for_pickup"
      );

    const anyReadyForPickup =
      statuses.some(
        (item) =>
          item ===
          "ready_for_pickup"
      );

    const anyProcessing =
      statuses.some(
        (item) =>
          item ===
          "processing"
      );

    const anyConfirmed =
      statuses.some(
        (item) =>
          item ===
          "confirmed"
      );

    if (allDelivered) {
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

    await order.save();

    if (
      status ===
        "picked_up" &&
      fulfillment.sellerId
    ) {
      await NotificationService.createNotification(
        {
          userId:
            String(
              fulfillment.sellerId
            ),

          type:
            "MARKETPLACE_PICKED_UP",

          title:
            "Marketplace order collected",

          message: `AgriNova collected your items for order ${order.orderNumber}.`,

          href:
            "/seller-orders",

          data: {
            orderId:
              String(
                order._id
              ),

            orderNumber:
              order.orderNumber,
          },
        }
      );
    }

    if (
      status ===
      "out_for_delivery"
    ) {
      await NotificationService.createNotification(
        {
          userId:
            String(
              order.customerId
            ),

          type:
            "MARKETPLACE_OUT_FOR_DELIVERY",

          title:
            "Order is out for delivery",

          message: `Order ${order.orderNumber} is on the way to you.`,

          href: `/orders/${order._id}`,

          data: {
            orderId:
              String(
                order._id
              ),

            orderNumber:
              order.orderNumber,
          },
        }
      );
    }

    if (
      status ===
      "delivered"
    ) {
      await NotificationService.createNotification(
        {
          userId:
            String(
              order.customerId
            ),

          type:
            "MARKETPLACE_DELIVERED",

          title:
            "Order delivered",

          message: `Order ${order.orderNumber} was marked delivered.`,

          href: `/orders/${order._id}`,

          data: {
            orderId:
              String(
                order._id
              ),

            orderNumber:
              order.orderNumber,
          },
        }
      );
    }

    return order;
  };

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
        ) || 1,
        1
      );

    const limit =
      Math.min(
        Math.max(
          Number(
            query.limit
          ) || 20,
          1
        ),
        50
      );

    const skip =
      (page - 1) *
      limit;

    const filter: Record<
      string,
      any
    > = {};

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

      filter.$or = [
        {
          paymentMethod:
            "cod",
        },

        {
          paymentStatus:
            "paid",
        },
      ];
    }

    if (query.status) {
      filter.status =
        String(
          query.status
        );
    }

    if (query.search) {
      const escaped =
        String(
          query.search
        ).replace(
          /[.*+?^${}()|[\]\\]/g,
          "\\$&"
        );

      const rx =
        new RegExp(
          escaped,
          "i"
        );

      const searchClause =
        {
          $or: [
            {
              orderNumber:
                rx,
            },

            {
              customerName:
                rx,
            },

            {
              "fulfillments.sellerName":
                rx,
            },
          ],
        };

      if (filter.$or) {
        filter.$and = [
          {
            $or:
              filter.$or,
          },

          searchClause,
        ];

        delete filter.$or;
      } else {
        Object.assign(
          filter,
          searchClause
        );
      }
    }

    const [
      data,
      total,
    ] =
      await Promise.all([
        Order.find(
          filter
        )
          .sort({
            createdAt: -1,
          })
          .skip(skip)
          .limit(limit)
          .lean(),

        Order.countDocuments(
          filter
        ),
      ]);

    return {
      data,

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
    };
  };

const updateOrderStatusByAdmin =
  async (
    orderId: string,
    status: any
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

export const OrderService =
  {
    getCheckoutConfig,

    createOrderInDB,

    getMyOrdersFromDB,

    getMyOrderByIdFromDB,

    getSellerOrdersFromDB,

    updateSellerFulfillment,

    updateAdminFulfillment,

    getAllOrdersForAdmin,

    updateOrderStatusByAdmin,
  };