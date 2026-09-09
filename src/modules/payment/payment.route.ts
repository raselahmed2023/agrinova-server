import {
    Router,
} from "express";

import authenticate from "../../middleware/authenticate";
import validateRequest from "../../middleware/validateRequest";

import {
    PaymentController,
} from "./payment.controller";

import {
    PaymentValidation,
} from "./payment.validation";

const router =
    Router();

/**
 * Stripe webhook
 *
 * This route is intentionally
 * NOT authenticated.
 *
 * Stripe authenticates the
 * request using the webhook
 * signature.
 */
router.post(
    "/stripe/webhook",
    PaymentController.stripeWebhook
);

/**
 * Create Stripe Checkout Session
 */
router.post(
    "/stripe/create-session",
    authenticate,
    validateRequest(
        PaymentValidation
            .createStripeCheckoutSessionValidationSchema
    ),
    PaymentController
        .createStripeCheckoutSession
);

/**
 * Get Stripe Checkout Session
 */
router.get(
    "/stripe/session/:sessionId",
    authenticate,
    PaymentController
        .getStripeCheckoutSession
);

export const PaymentRoutes =
    router;