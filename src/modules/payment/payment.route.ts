import { Router } from "express";

import authenticate from "../../middleware/authenticate";
import authorize from "../../middleware/authorize";

import { PaymentController } from "./payment.controller";

const router = Router();


// =====================================
// MARKETPLACE / EXISTING STRIPE ROUTES
// =====================================

router.post(
  "/stripe/checkout-session",
  authenticate,
  authorize("FARMER"),
  PaymentController.createCheckoutSession
);

router.get(
  "/stripe/status/:orderId",
  authenticate,
  authorize("FARMER"),
  PaymentController.getPaymentStatus
);

router.get(
  "/stripe/session/:sessionId",
  authenticate,
  authorize("FARMER"),
  PaymentController.verifyCheckoutSession
);

router.post(
  "/stripe/cancel/:orderId",
  authenticate,
  authorize("FARMER"),
  PaymentController.cancelCheckoutOrder
);


// =====================================
// EXPERT CONSULTATION STRIPE ROUTES
// =====================================

router.post(
  "/stripe/consultation-checkout",
  authenticate,
  authorize("FARMER"),
  PaymentController.createConsultationCheckoutSession
);

router.get(
  "/stripe/consultation-session/:sessionId",
  authenticate,
  authorize("FARMER"),
  PaymentController.verifyConsultationCheckoutSession
);

router.post(
  "/stripe/consultation-cancel/:consultationId",
  authenticate,
  authorize("FARMER"),
  PaymentController.cancelConsultationCheckout
);


export const PaymentRoutes = router;