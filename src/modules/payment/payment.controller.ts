import { Request, Response } from "express";
import Stripe from "stripe";

import { PaymentService } from "./payment.service";
import { InvestmentService } from "../investment/investment.service";

const getWebhookSecret = () => {
  const secret =
    process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error(
      "STRIPE_WEBHOOK_SECRET is not configured"
    );
  }

  return secret;
};

const createCheckoutSession = async (
  req: Request,
  res: Response
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
  }

  const orderId = req.body?.orderId;

  if (
    !orderId ||
    typeof orderId !== "string"
  ) {
    return res.status(400).json({
      success: false,
      message: "orderId is required.",
    });
  }

  const result =
    await PaymentService.createStripeCheckoutSession(
      {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
      },
      orderId
    );

  return res.status(200).json({
    success: true,
    message:
      "Stripe checkout session created successfully.",
    data: result,
  });
};

const getPaymentStatus = async (
  req: Request,
  res: Response
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
  }

  const orderIdParam =
    req.params.orderId;

  const orderId = Array.isArray(
    orderIdParam
  )
    ? orderIdParam[0]
    : orderIdParam;

  if (!orderId) {
    return res.status(400).json({
      success: false,
      message: "Order ID is required.",
    });
  }

  const result =
    await PaymentService.getStripePaymentStatus(
      req.user.id,
      orderId
    );

  return res.status(200).json({
    success: true,
    message:
      "Payment status retrieved successfully.",
    data: result,
  });
};

const verifyCheckoutSession = async (
  req: Request,
  res: Response
) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Authentication required." });
  }

  const sessionId = Array.isArray(req.params.sessionId)
    ? req.params.sessionId[0]
    : req.params.sessionId;

  if (!sessionId) {
    return res.status(400).json({ success: false, message: "Stripe session ID is required." });
  }

  const result = await PaymentService.verifyStripeCheckoutSession(
    req.user.id,
    sessionId
  );

  return res.status(200).json({
    success: true,
    message: "Stripe checkout session verified.",
    data: result,
  });
};

const cancelCheckoutOrder = async (
  req: Request,
  res: Response
) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Authentication required." });
  }

  const orderId = Array.isArray(req.params.orderId)
    ? req.params.orderId[0]
    : req.params.orderId;

  if (!orderId) {
    return res.status(400).json({ success: false, message: "Order ID is required." });
  }

  const result = await PaymentService.cancelPendingCardOrder(
    req.user.id,
    orderId
  );

  return res.status(200).json({
    success: true,
    message: "Checkout cancelled and reserved stock released.",
    data: result,
  });
};

const handleWebhook = async (
  req: Request,
  res: Response
) => {
  const signature =
    req.headers["stripe-signature"];

  if (
    !signature ||
    Array.isArray(signature)
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Missing Stripe signature.",
    });
  }

  let event: Stripe.Event;

  try {
    const secretKey =
      process.env.STRIPE_SECRET_KEY ||
      process.env.STRIPE_SECRET;

    if (!secretKey) {
      throw new Error(
        "STRIPE_SECRET_KEY is not configured"
      );
    }

    const stripe =
      new Stripe(secretKey);

    event =
      stripe.webhooks.constructEvent(
        req.body,
        signature,
        getWebhookSecret()
      );
  } catch (error) {
    console.error(
      "Stripe webhook verification failed:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        "Invalid Stripe webhook signature.",
    });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session =
          event.data.object as Stripe.Checkout.Session;

        const orderId = session.metadata?.orderId;
        const investmentApplicationId = session.metadata?.investmentApplicationId;

        if (investmentApplicationId && session.payment_status === "paid") {
          await InvestmentService.confirmPaidApplication(
            investmentApplicationId,
            {
              stripeSessionId: session.id,
              stripePaymentIntentId:
                typeof session.payment_intent === "string"
                  ? session.payment_intent
                  : undefined,
            }
          );
        } else if (orderId && session.payment_status === "paid") {
          await PaymentService.markOrderPaid(orderId, session.id);
        }

        break;
      }

      case "checkout.session.async_payment_succeeded": {
        const session =
          event.data.object as Stripe.Checkout.Session;

        const orderId = session.metadata?.orderId;
        const investmentApplicationId = session.metadata?.investmentApplicationId;

        if (investmentApplicationId) {
          await InvestmentService.confirmPaidApplication(
            investmentApplicationId,
            {
              stripeSessionId: session.id,
              stripePaymentIntentId:
                typeof session.payment_intent === "string"
                  ? session.payment_intent
                  : undefined,
            }
          );
        } else if (orderId) {
          await PaymentService.markOrderPaid(orderId, session.id);
        }

        break;
      }

      case "checkout.session.expired": {
        const session =
          event.data.object as Stripe.Checkout.Session;

        const orderId = session.metadata?.orderId;
        if (orderId) {
          await PaymentService.markOrderPaymentFailed(orderId, session.id);
        }

        break;
      }

      case "checkout.session.async_payment_failed": {
        const session =
          event.data.object as Stripe.Checkout.Session;

        const orderId = session.metadata?.orderId;
        const investmentApplicationId = session.metadata?.investmentApplicationId;

        if (investmentApplicationId) {
          await InvestmentService.markInvestmentPaymentFailed(
            investmentApplicationId,
            session.id
          );
        } else if (orderId) {
          await PaymentService.markOrderPaymentFailed(orderId, session.id);
        }

        break;
      }

      case "payment_intent.payment_failed": {
        // A failed PaymentIntent inside an open Checkout Session can still be retried.
        // Do not release reserved inventory here; release only when Checkout expires,
        // async payment fails, or the customer explicitly cancels.
        break;
      }

      default:
        break;
    }

    return res.status(200).json({
      received: true,
    });
  } catch (error) {
    console.error(
      "Stripe webhook processing failed:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Webhook processing failed.",
    });
  }
};

export const PaymentController = {
  createCheckoutSession,
  getPaymentStatus,
  verifyCheckoutSession,
  cancelCheckoutOrder,
  handleWebhook,
};