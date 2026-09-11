import { Router } from "express";

import authenticate from "../../middleware/authenticate";
import authorize from "../../middleware/authorize";
import { PaymentController } from "./payment.controller";

const router = Router();

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

export const PaymentRoutes = router;
