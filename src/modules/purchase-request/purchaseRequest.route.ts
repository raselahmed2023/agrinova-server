import { Router } from "express";

import validateRequest from "../../middleware/validateRequest";

import { PurchaseRequestController } from "./purchaseRequest.controller";
import { PurchaseRequestValidation } from "./purchaseRequest.validation";

const router = Router();

router.post(
  "/",
  validateRequest(
    PurchaseRequestValidation.createPurchaseRequestSchema
  ),
  PurchaseRequestController.createPurchaseRequest
);

router.get(
  "/sent",
  PurchaseRequestController.getSentRequests
);

router.get(
  "/received",
  PurchaseRequestController.getReceivedRequests
);

router.get(
  "/:requestId",
  PurchaseRequestController.getSingleRequest
);

router.patch(
  "/:requestId/status",
  validateRequest(
    PurchaseRequestValidation.updateStatusSchema
  ),
  PurchaseRequestController.updateRequestStatus
);

export const PurchaseRequestRoutes =
  router;