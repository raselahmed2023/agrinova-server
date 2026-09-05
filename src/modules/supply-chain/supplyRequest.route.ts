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

const router =
  Router();

/*
  PUBLIC SUBMISSION
*/

router.post(
  "/requests",

  validateRequest(
    SupplyRequestValidation
      .createSupplyRequestSchema
  ),

  SupplyRequestController
    .createSupplyRequest
);

/*
  PUBLIC TRACKING
*/

router.get(
  "/requests/track/:trackingCode",

  validateRequest(
    SupplyRequestValidation
      .trackingSchema
  ),

  SupplyRequestController
    .trackSupplyRequest
);

/*
  ADMIN
*/

router.get(
  "/requests",

  authenticate,

  authorize(
    "ADMIN"
  ),

  validateRequest(
    SupplyRequestValidation
      .adminQuerySchema
  ),

  SupplyRequestController
    .getAllSupplyRequests
);

router.get(
  "/requests/:requestId",

  authenticate,

  authorize(
    "ADMIN"
  ),

  SupplyRequestController
    .getSupplyRequestById
);

router.patch(
  "/requests/:requestId/status",

  authenticate,

  authorize(
    "ADMIN"
  ),

  validateRequest(
    SupplyRequestValidation
      .updateStatusSchema
  ),

  SupplyRequestController
    .updateSupplyRequestStatus
);

export const SupplyChainRoutes =
  router;