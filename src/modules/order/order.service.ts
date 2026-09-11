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

            approvedAt: {
                $exists: true,
                $ne: null,
            },
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
                product.sellerId ||
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

                items: [item],

                subtotal:
                    Number(
                        item.subtotal.toFixed(2)
                    ),

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

                                approvedAt: {
                                    $exists: true,
                                    $ne: null,
                                },

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

                                paymentStatus: "pending",

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

const toSellerOrderView = (
    order: any,
    sellerId: string,
    sellerEmail: string
) => {
    const normalizedEmail = sellerEmail.trim().toLowerCase();
    const source = typeof order?.toObject === "function"
        ? order.toObject()
        : order;

    return {
        ...source,
        fulfillments: (source.fulfillments || []).filter(
            (fulfillment: any) =>
                fulfillment.sellerId === sellerId ||
                fulfillment.sellerEmail === normalizedEmail
        ),
    };
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
            })
                .sort({
                    createdAt: -1,
                })
                .lean();

        return orders.map((order) =>
            toSellerOrderView(order, sellerId, normalizedEmail)
        );
    };

const updateSellerFulfillment =
    async (
        orderId: string,

        sellerId: string,

        sellerEmail: string,

        status: any,

    ) => {
        const SELLER_ALLOWED_STATUSES = [
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
                _id: orderId,

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
            });

        if (!order) {
            throw new AppError(
                404,
                "Order not found"
            );
        }

        /**
         * Find ONLY this seller's
         * fulfillment.
         */
        const fulfillment =
            order.fulfillments.find(
                (item) =>
                    item.sellerId ===
                    sellerId ||
                    item.sellerEmail ===
                    normalizedEmail
            );

        if (!fulfillment) {
            throw new AppError(
                403,
                "You are not a seller in this order"
            );
        }

        /**
         * Seller can update only
         * their own fulfillment.
         */
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

            ready_for_pickup: [],
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

/**
         * Recalculate master order
         * status from all seller
         * fulfillments.
         */
        const statuses =
            order.fulfillments.map(
                (item) =>
                    item.status
            );

        const allDelivered =
            statuses.length > 0 &&
            statuses.every(
                (status) =>
                    status ===
                    "delivered"
            );

        const anyDelivered =
            statuses.some(
                (status) =>
                    status ===
                    "delivered"
            );

        const anyOutForDelivery =
            statuses.some(
                (status) =>
                    status ===
                    "out_for_delivery"
            );

        const anyPickedUp =
            statuses.some(
                (status) =>
                    status ===
                    "picked_up"
            );

        const allReadyForPickup =
            statuses.length > 0 &&
            statuses.every(
                (status) =>
                    status ===
                    "ready_for_pickup"
            );

        const anyReadyForPickup =
            statuses.some(
                (status) =>
                    status ===
                    "ready_for_pickup"
            );

        const anyProcessing =
            statuses.some(
                (status) =>
                    status ===
                    "processing"
            );

        const anyConfirmed =
            statuses.some(
                (status) =>
                    status ===
                    "confirmed"
            );

        /**
         * Calculate master order status
         * from all seller fulfillments.
         *
         * The master order represents
         * the overall progress of the
         * complete customer order.
         */
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

        return toSellerOrderView(
            order,
            sellerId,
            normalizedEmail
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

        const ADMIN_DELIVERY_STATUSES = [
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

    updateAdminFulfillment,

    getAllOrdersForAdmin,

    updateOrderStatusByAdmin,
};