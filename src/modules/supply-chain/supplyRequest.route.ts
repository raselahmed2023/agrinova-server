import {
  Router,
} from "express";

import authenticate from "../../middleware/authenticate";
import authorize from "../../middleware/authorize";
import validateRequest from "../../middleware/validateRequest";

import {
  SupplyRequestController,
} from "./supplyRequest.controller";

import {
  SupplyRequestValidation,
} from "./supplyRequest.validation";

const router = Router();

router.post(
  "/requests",
  validateRequest(
    SupplyRequestValidation
      .createSupplyRequestSchema
  ),
  SupplyRequestController
    .createSupplyRequest
);

router.get(
  "/requests",
  authenticate,
  authorize("ADMIN"),
  SupplyRequestController
    .getAllSupplyRequests
);

router.get(
  "/requests/:requestId",
  authenticate,
  authorize("ADMIN"),
  SupplyRequestController
    .getSupplyRequestById
);

router.patch(
  "/requests/:requestId/status",
  authenticate,
  authorize("ADMIN"),
  validateRequest(
    SupplyRequestValidation
      .updateStatusSchema
  ),
  SupplyRequestController
    .updateSupplyRequestStatus
);

export const SupplyChainRoutes =
  router;