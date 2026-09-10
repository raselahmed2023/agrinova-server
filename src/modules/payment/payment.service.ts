import Stripe from "stripe";
import { isValidObjectId } from "mongoose";

import AppError from "../../utils/AppError";

import { Order } from "../order/order.model";

import type {
  IStripeCheckoutCustomer,
  IStripeCheckoutResponse,
  IStripePaymentStatusResponse,
} from "./payment.interface";

const getStripeSecretKey = () => {
  const key =
    process.env.STRIPE_SECRET_KEY ||
    process.env.STRIPE_SECRET;

  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not configured"
    );
  }

  return key;
};

const getClientUrl = () => {
  const url =
    process.env.CLIENT_URL ||
    process.env.FRONTEND_URL;

  if (!url) {
    throw new Error(
      "CLIENT_URL is not configured"
    );
  }

  return url.replace(/\/$/, "");
};

const getStripe = () => {
  return new Stripe(
    getStripeSecretKey()
  );
};

const toMinorUnit = (
  amount: number
) => {
  const value =
    Math.round(
      Number(amount) * 100
    );

  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    throw new AppError(
      400,
      "Invalid payment amount"
    );
  }

  return value;
};

const createStripeCheckoutSession =
  async (
    customer: IStripeCheckoutCustomer,
    orderId: string
  ): Promise<IStripeCheckoutResponse> => {
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
        customerId: customer.id,
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
        "This order is not configured for card payment"
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

    if (
      Number(order.totalAmount) <=
      0
    ) {
      throw new AppError(
        400,
        "This order does not require a card payment"
      );
    }

    const stripe =
      getStripe();

    const lineItems:
      Stripe.Checkout.SessionCreateParams.LineItem[] =
      [];

    for (
      const item of order.items
    ) {
      const subtotal =
        Number(item.subtotal);

      if (
        !Number.isFinite(
          subtotal
        ) ||
        subtotal <= 0
      ) {
        continue;
      }

      lineItems.push({
        quantity:
          item.quantity,

        price_data: {
          currency: "bdt",

          product_data: {
            name:
              item.title,

            description:
              `${item.quantity} ${item.unit}`,
          },

          unit_amount:
            toMinorUnit(
              item.price
            ),
        },
      });
    }

    if (
      Number(order.deliveryFee) >
      0
    ) {
      lineItems.push({
        quantity: 1,

        price_data: {
          currency: "bdt",

          product_data: {
            name:
              "Delivery Fee",
          },

          unit_amount:
            toMinorUnit(
              order.deliveryFee
            ),
        },
      });
    }

    if (
      lineItems.length === 0
    ) {
      throw new AppError(
        400,
        "No payable items found for this order"
      );
    }

    const session =
      await stripe.checkout.sessions.create(
        {
          mode: "payment",

          line_items:
            lineItems,

          customer_email:
            customer.email,

          client_reference_id:
            String(order._id),

          metadata: {
            orderId:
              String(order._id),

            orderNumber:
              order.orderNumber,

            customerId:
              customer.id,
          },

          success_url:
            `${getClientUrl()}/checkout/success?session_id={CHECKOUT_SESSION_ID}&orderId=${order._id}`,

          cancel_url:
            `${getClientUrl()}/checkout/cancel?orderId=${order._id}`,

          billing_address_collection:
            "auto",

          allow_promotion_codes:
            false,

          submit_type:
            "pay",
        }
      );

    order.paymentReference =
      session.id;

    await order.save();

    return {
      sessionId:
        session.id,

      url:
        session.url,
    };
  };

const getStripePaymentStatus =
  async (
    customerId: string,
    orderId: string
  ): Promise<IStripePaymentStatusResponse> => {
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

    return {
      orderId:
        String(order._id),

      orderNumber:
        order.orderNumber,

      paymentStatus:
        order.paymentStatus,

      paymentReference:
        order.paymentReference,
    };
  };

const markOrderPaid =
  async (
    orderId: string,
    paymentReference: string
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
      await Order.findById(
        orderId
      );

    if (!order) {
      throw new AppError(
        404,
        "Order not found"
      );
    }

    if (
      order.paymentStatus ===
      "paid"
    ) {
      return order;
    }

    order.paymentStatus =
      "paid";

    order.paymentReference =
      paymentReference;

    if (
      order.status ===
      "pending"
    ) {
      order.status =
        "confirmed";
    }

    for (
      const fulfillment of
        order.fulfillments
    ) {
      if (
        fulfillment.status ===
        "pending"
      ) {
        fulfillment.status =
          "confirmed";
      }
    }

    await order.save();

    return order;
  };

const markOrderPaymentFailed =
  async (
    orderId: string,
    paymentReference?: string
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
      await Order.findById(
        orderId
      );

    if (!order) {
      throw new AppError(
        404,
        "Order not found"
      );
    }

    if (
      order.paymentStatus ===
      "paid"
    ) {
      return order;
    }

    order.paymentStatus =
      "failed";

    if (
      paymentReference
    ) {
      order.paymentReference =
        paymentReference;
    }

    await order.save();

    return order;
  };

export const PaymentService = {
  createStripeCheckoutSession,

  getStripePaymentStatus,

  markOrderPaid,

  markOrderPaymentFailed,
};