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


// =====================================
// MARKETPLACE STRIPE
// =====================================

const createCheckoutSession = async (
  req: Request,
  res: Response
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message:
        "Authentication required.",
    });
  }

  const orderId =
    req.body?.orderId;

  if (
    !orderId ||
    typeof orderId !== "string"
  ) {
    return res.status(400).json({
      success: false,
      message:
        "orderId is required.",
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
      message:
        "Authentication required.",
    });
  }

  const orderIdParam =
    req.params.orderId;

  const orderId =
    Array.isArray(orderIdParam)
      ? orderIdParam[0]
      : orderIdParam;

  if (!orderId) {
    return res.status(400).json({
      success: false,
      message:
        "Order ID is required.",
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
    return res.status(401).json({
      success: false,
      message:
        "Authentication required.",
    });
  }

  const sessionId =
    Array.isArray(
      req.params.sessionId
    )
      ? req.params.sessionId[0]
      : req.params.sessionId;

  if (!sessionId) {
    return res.status(400).json({
      success: false,
      message:
        "Stripe session ID is required.",
    });
  }

  const result =
    await PaymentService.verifyStripeCheckoutSession(
      req.user.id,
      sessionId
    );

  return res.status(200).json({
    success: true,
    message:
      "Stripe checkout session verified.",
    data: result,
  });
};


const cancelCheckoutOrder = async (
  req: Request,
  res: Response
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message:
        "Authentication required.",
    });
  }

  const orderId =
    Array.isArray(
      req.params.orderId
    )
      ? req.params.orderId[0]
      : req.params.orderId;

  if (!orderId) {
    return res.status(400).json({
      success: false,
      message:
        "Order ID is required.",
    });
  }

  const result =
    await PaymentService.cancelPendingCardOrder(
      req.user.id,
      orderId
    );

  return res.status(200).json({
    success: true,
    message:
      "Checkout cancelled and reserved stock released.",
    data: result,
  });
};


// =====================================
// EXPERT CONSULTATION STRIPE
// =====================================

const createConsultationCheckoutSession =
  async (
    req: Request,
    res: Response
  ) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required.",
      });
    }

    const consultationId =
      req.body?.consultationId;

    if (
      !consultationId ||
      typeof consultationId !==
        "string"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "consultationId is required.",
      });
    }

    const result =
      await PaymentService
        .createConsultationStripeCheckoutSession(
          {
            id:
              req.user.id,

            email:
              req.user.email,

            name:
              req.user.name,
          },

          consultationId
        );

    return res
      .status(200)
      .json({
        success: true,

        message:
          "Consultation Stripe checkout session created successfully.",

        data:
          result,
      });
  };


const verifyConsultationCheckoutSession =
  async (
    req: Request,
    res: Response
  ) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required.",
      });
    }

    const sessionId =
      Array.isArray(
        req.params.sessionId
      )
        ? req.params.sessionId[0]
        : req.params.sessionId;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message:
          "Stripe session ID is required.",
      });
    }

    const result =
      await PaymentService
        .verifyConsultationStripeCheckoutSession(
          req.user.id,
          sessionId
        );

    return res
      .status(200)
      .json({
        success: true,

        message:
          "Consultation Stripe payment verified successfully.",

        data:
          result,
      });
  };


const cancelConsultationCheckout =
  async (
    req: Request,
    res: Response
  ) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required.",
      });
    }

    const consultationId =
      Array.isArray(
        req.params.consultationId
      )
        ? req.params.consultationId[0]
        : req.params.consultationId;

    if (!consultationId) {
      return res.status(400).json({
        success: false,
        message:
          "Consultation ID is required.",
      });
    }

    const result =
      await PaymentService
        .cancelConsultationStripeCheckout(
          req.user.id,
          consultationId
        );

    return res
      .status(200)
      .json({
        success: true,

        message:
          "Consultation checkout cancelled successfully.",

        data:
          result,
      });
  };


// =====================================
// STRIPE WEBHOOK
// Marketplace + Investment + Consultation
// =====================================

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

      // ===================================
      // PAYMENT COMPLETED
      // ===================================

      case "checkout.session.completed": {
        const session =
          event.data.object as Stripe.Checkout.Session;

        const orderId =
          session.metadata?.orderId;

        const investmentApplicationId =
          session.metadata
            ?.investmentApplicationId;

        const consultationId =
          session.metadata
            ?.consultationId;


        // -------------------------------
        // EXPERT CONSULTATION
        // -------------------------------

        if (
          consultationId &&
          session.payment_status ===
            "paid"
        ) {
          await PaymentService
            .confirmConsultationPaid(
              consultationId,

              session.id,

              typeof session.payment_intent ===
                "string"
                ? session.payment_intent
                : undefined
            );
        }

        // -------------------------------
        // INVESTMENT
        // -------------------------------

        else if (
          investmentApplicationId &&
          session.payment_status ===
            "paid"
        ) {
          await InvestmentService
            .confirmPaidApplication(
              investmentApplicationId,
              {
                stripeSessionId:
                  session.id,

                stripePaymentIntentId:
                  typeof session.payment_intent ===
                    "string"
                    ? session.payment_intent
                    : undefined,
              }
            );
        }

        // -------------------------------
        // MARKETPLACE
        // -------------------------------

        else if (
          orderId &&
          session.payment_status ===
            "paid"
        ) {
          await PaymentService
            .markOrderPaid(
              orderId,
              session.id
            );
        }

        break;
      }


      // ===================================
      // ASYNC PAYMENT SUCCESS
      // ===================================

      case "checkout.session.async_payment_succeeded": {
        const session =
          event.data.object as Stripe.Checkout.Session;

        const orderId =
          session.metadata?.orderId;

        const investmentApplicationId =
          session.metadata
            ?.investmentApplicationId;

        const consultationId =
          session.metadata
            ?.consultationId;


        // -------------------------------
        // EXPERT CONSULTATION
        // -------------------------------

        if (
          consultationId
        ) {
          await PaymentService
            .confirmConsultationPaid(
              consultationId,

              session.id,

              typeof session.payment_intent ===
                "string"
                ? session.payment_intent
                : undefined
            );
        }

        // -------------------------------
        // INVESTMENT
        // -------------------------------

        else if (
          investmentApplicationId
        ) {
          await InvestmentService
            .confirmPaidApplication(
              investmentApplicationId,
              {
                stripeSessionId:
                  session.id,

                stripePaymentIntentId:
                  typeof session.payment_intent ===
                    "string"
                    ? session.payment_intent
                    : undefined,
              }
            );
        }

        // -------------------------------
        // MARKETPLACE
        // -------------------------------

        else if (
          orderId
        ) {
          await PaymentService
            .markOrderPaid(
              orderId,
              session.id
            );
        }

        break;
      }


      // ===================================
      // CHECKOUT SESSION EXPIRED
      // ===================================

      case "checkout.session.expired": {
        const session =
          event.data.object as Stripe.Checkout.Session;

        const orderId =
          session.metadata?.orderId;

        const investmentApplicationId =
          session.metadata
            ?.investmentApplicationId;

        const consultationId =
          session.metadata
            ?.consultationId;


        // -------------------------------
        // EXPERT CONSULTATION
        // -------------------------------

        if (
          consultationId
        ) {
          await PaymentService
            .markConsultationPaymentFailed(
              consultationId,
              session.id
            );
        }

        // -------------------------------
        // INVESTMENT
        // -------------------------------

        else if (
          investmentApplicationId
        ) {
          await InvestmentService
            .markInvestmentPaymentFailed(
              investmentApplicationId,
              session.id
            );
        }

        // -------------------------------
        // MARKETPLACE
        // -------------------------------

        else if (
          orderId
        ) {
          await PaymentService
            .markOrderPaymentFailed(
              orderId,
              session.id
            );
        }

        break;
      }


      // ===================================
      // ASYNC PAYMENT FAILED
      // ===================================

      case "checkout.session.async_payment_failed": {
        const session =
          event.data.object as Stripe.Checkout.Session;

        const orderId =
          session.metadata?.orderId;

        const investmentApplicationId =
          session.metadata
            ?.investmentApplicationId;

        const consultationId =
          session.metadata
            ?.consultationId;


        // -------------------------------
        // EXPERT CONSULTATION
        // -------------------------------

        if (
          consultationId
        ) {
          await PaymentService
            .markConsultationPaymentFailed(
              consultationId,
              session.id
            );
        }

        // -------------------------------
        // INVESTMENT
        // -------------------------------

        else if (
          investmentApplicationId
        ) {
          await InvestmentService
            .markInvestmentPaymentFailed(
              investmentApplicationId,
              session.id
            );
        }

        // -------------------------------
        // MARKETPLACE
        // -------------------------------

        else if (
          orderId
        ) {
          await PaymentService
            .markOrderPaymentFailed(
              orderId,
              session.id
            );
        }

        break;
      }


      // ===================================
      // PAYMENT INTENT FAILED
      // ===================================

      case "payment_intent.payment_failed": {
        /*
         * No action required here.
         *
         * Checkout session expiration /
         * async_payment_failed handles
         * consultation, investment,
         * and marketplace cleanup.
         */
        break;
      }


      default:
        break;
    }


    return res
      .status(200)
      .json({
        received: true,
      });

  } catch (error) {
    console.error(
      "Stripe webhook processing failed:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,

        message:
          "Webhook processing failed.",
      });
  }
};


export const PaymentController = {
  // Marketplace
  createCheckoutSession,
  getPaymentStatus,
  verifyCheckoutSession,
  cancelCheckoutOrder,

  // Expert Consultation
  createConsultationCheckoutSession,
  verifyConsultationCheckoutSession,
  cancelConsultationCheckout,

  // Stripe Webhook
  handleWebhook,
};