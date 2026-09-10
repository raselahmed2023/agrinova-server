import Stripe from "stripe";

import AppError from "../../utils/AppError";

import {
    Order,
} from "../order/order.model";

import {
    IStripeCheckoutSessionResponse,
} from "./payment.interface";

import {
    Product,
} from "../product/product.model";

const getStripe = () => {
    const secretKey =
        process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
        throw new AppError(
            500,
            "Stripe secret key is not configured"
        );
    }

    return new Stripe(
        secretKey
    );
};

const getStripeCurrency = () => {
    return (
        process.env.STRIPE_CURRENCY ||
        "bdt"
    ).toLowerCase();
};

const getFrontendUrl = () => {
    const url =
        process.env.CLIENT_URL;

    if (!url) {
        throw new AppError(
            500,
            "CLIENT_URL is not configured"
        );
    }

    return url.replace(
        /\/$/,
        ""
    );
};
const restoreOrderStock =
    async (
        orderId: string
    ) => {
        const order =
            await Order.findById(
                orderId
            );

        if (!order) {
            return;
        }

        /**
         * Never restore stock twice.
         */
        if (
            order.stockRestored ===
            true
        ) {
            return;
        }

        /**
         * Only unpaid card orders
         * can have their stock restored
         * by Stripe failure/expiry.
         */
        if (
            order.paymentMethod !==
            "card"
        ) {
            return;
        }

        if (
            order.paymentStatus ===
            "paid"
        ) {
            return;
        }

        for (
            const item of
            order.items
        ) {
            const product =
                await Product.findById(
                    item.productId
                );

            if (!product) {
                continue;
            }

            const currentQuantity =
                Number(
                    product.quantity
                );

            const restoredQuantity =
                currentQuantity +
                Number(
                    item.quantity
                );

            product.quantity =
                restoredQuantity;

            if (
                product.status ===
                "out_of_stock" &&
                restoredQuantity > 0
            ) {
                product.status =
                    "available";
            }

            await product.save();
        }

        order.stockRestored =
            true;

        await order.save();
    };

const toStripeAmount = (
    amount: number
) => {
    const value =
        Number(amount);

    if (
        !Number.isFinite(value) ||
        value <= 0
    ) {
        throw new AppError(
            400,
            "Invalid payment amount"
        );
    }

    return Math.round(
        value * 100
    );
};

const createStripeCheckoutSession =
    async (
        orderId: string,
        customerId: string,
        customerEmail: string
    ): Promise<IStripeCheckoutSessionResponse> => {
        const order =
            await Order.findOne({
                _id: orderId,
                customerId,
            });

        if (!order) {
            throw new AppError(
                404,
                "Order not found"
            );
        }

        if (
            order.paymentMethod !==
            "card"
        ) {
            throw new AppError(
                400,
                "Stripe payment is only available for card orders"
            );
        }

        if (
            order.paymentStatus ===
            "paid"
        ) {
            throw new AppError(
                400,
                "This order has already been paid"
            );
        }

        const stripe =
            getStripe();

        const currency =
            getStripeCurrency();

        const lineItems:
            Stripe.Checkout.SessionCreateParams.LineItem[] =
            order.items.map(
                (item) => ({
                    price_data: {
                        currency,

                        product_data: {
                            name:
                                item.title,

                            ...(item.image
                                ? {
                                    images: [
                                        item.image,
                                    ],
                                }
                                : {}),
                        },

                        unit_amount:
                            toStripeAmount(
                                item.price
                            ),
                    },

                    quantity:
                        item.quantity,
                })
            );

        if (
            Number(
                order.deliveryFee
            ) > 0
        ) {
            lineItems.push({
                price_data: {
                    currency,

                    product_data: {
                        name:
                            "Delivery Fee",
                    },

                    unit_amount:
                        toStripeAmount(
                            order.deliveryFee
                        ),
                },

                quantity: 1,
            });
        }

        const frontendUrl =
            getFrontendUrl();

        const session =
            await stripe.checkout.sessions.create(
                {
                    mode: "payment",

                    payment_method_types: [
                        "card",
                    ],

                    customer_email:
                        customerEmail,

                    line_items:
                        lineItems,

                    metadata: {
                        orderId:
                            String(
                                order._id
                            ),

                        orderNumber:
                            order.orderNumber,

                        customerId,
                    },

                    payment_intent_data: {
                        metadata: {
                            orderId:
                                String(
                                    order._id
                                ),

                            orderNumber:
                                order.orderNumber,

                            customerId,
                        },
                    },

                    success_url:
                        `${frontendUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,

                    cancel_url:
                        `${frontendUrl}/checkout/cancel?orderId=${order._id}`,

                    expires_at:
                        Math.floor(
                            Date.now() /
                            1000
                        ) +
                        30 * 60,
                }
            );

        if (
            !session.url
        ) {
            throw new AppError(
                500,
                "Stripe checkout URL was not created"
            );
        }

        order.paymentReference =
            session.id;

        await order.save();

        return {
            sessionId:
                session.id,

            checkoutUrl:
                session.url,
        };
    };

const handleStripeWebhook =
    async (
        rawBody: Buffer,
        signature: string
    ) => {
        const webhookSecret =
            process.env
                .STRIPE_WEBHOOK_SECRET;

        if (!webhookSecret) {
            throw new AppError(
                500,
                "STRIPE_WEBHOOK_SECRET is not configured"
            );
        }

        const stripe =
            getStripe();

        let event: Stripe.Event;

        try {
            event =
                stripe.webhooks.constructEvent(
                    rawBody,
                    signature,
                    webhookSecret
                );
        } catch {
            throw new AppError(
                400,
                "Invalid Stripe webhook signature"
            );
        }

        switch (
        event.type
        ) {
            case "checkout.session.completed": {
                const session =
                    event.data.object as Stripe.Checkout.Session;

                const orderId =
                    session.metadata
                        ?.orderId;

                if (!orderId) {
                    break;
                }

                const order =
                    await Order.findById(
                        orderId
                    );

                if (!order) {
                    break;
                }

                if (
                    session.payment_status ===
                    "paid"
                ) {
                    order.paymentStatus =
                        "paid";

                    order.paymentReference =
                        session.payment_intent
                            ? String(
                                session.payment_intent
                            )
                            : session.id;

                    if (
                        order.status ===
                        "pending"
                    ) {
                        order.status =
                            "confirmed";
                    }

                    await order.save();
                }

                break;
            }

            case "checkout.session.expired": {
                const session =
                    event.data.object as Stripe.Checkout.Session;

                const orderId =
                    session.metadata
                        ?.orderId;

                if (!orderId) {
                    break;
                }

                const order =
                    await Order.findById(
                        orderId
                    );

                if (!order) {
                    break;
                }

                if (
                    order.paymentStatus !==
                    "paid"
                ) {
                    order.paymentStatus =
                        "failed";

                    await order.save();

                    await restoreOrderStock(
                        orderId
                    );
                }

                break;
            }

            case "payment_intent.succeeded": {
                const paymentIntent =
                    event.data.object as Stripe.PaymentIntent;

                const orderId =
                    paymentIntent.metadata
                        ?.orderId;

                if (!orderId) {
                    break;
                }

                const order =
                    await Order.findById(
                        orderId
                    );

                if (!order) {
                    break;
                }

                order.paymentStatus =
                    "paid";

                order.paymentReference =
                    paymentIntent.id;

                if (
                    order.status ===
                    "pending"
                ) {
                    order.status =
                        "confirmed";
                }

                await order.save();

                break;
            }

            case "payment_intent.payment_failed": {
                const paymentIntent =
                    event.data.object as Stripe.PaymentIntent;

                const orderId =
                    paymentIntent.metadata
                        ?.orderId;

                if (!orderId) {
                    break;
                }

                const order =
                    await Order.findById(
                        orderId
                    );

                if (!order) {
                    break;
                }

                if (
                    order.paymentStatus !==
                    "paid"
                ) {
                    order.paymentStatus =
                        "failed";

                    await order.save();

                    await restoreOrderStock(
                        orderId
                    );
                }

                break;
            }

            default:
                break;
        }

        return {
            received: true,
            eventType:
                event.type,
        };
    };

const getStripeCheckoutSession =
    async (
        sessionId: string,
        customerId: string
    ) => {
        if (!sessionId) {
            throw new AppError(
                400,
                "Stripe session ID is required"
            );
        }

        const stripe =
            getStripe();

        const session =
            await stripe.checkout.sessions.retrieve(
                sessionId
            );

        const orderId =
            session.metadata
                ?.orderId;

        if (!orderId) {
            throw new AppError(
                404,
                "Order reference not found in Stripe session"
            );
        }

        const order =
            await Order.findOne({
                _id: orderId,
                customerId,
            });

        if (!order) {
            throw new AppError(
                404,
                "Order not found"
            );
        }

        return {
            sessionId:
                session.id,

            paymentStatus:
                session.payment_status,

            status:
                session.status,

            orderId,

            orderNumber:
                order.orderNumber,

            orderPaymentStatus:
                order.paymentStatus,
        };
    };

export const PaymentService = {
    createStripeCheckoutSession,

    handleStripeWebhook,

    getStripeCheckoutSession,
};