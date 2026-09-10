import {
  Router,
} from "express";

import authenticate from "../../middleware/authenticate";

import {
  PaymentController,
} from "./payment.controller";

const router =
  Router();

router.post(
  "/stripe/checkout-session",
  authenticate,
  PaymentController.createCheckoutSession
);

router.get(
  "/stripe/status/:orderId",
  authenticate,
  PaymentController.getPaymentStatus
);

export const PaymentRoutes =
  router;