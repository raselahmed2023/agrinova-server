import {
  Router,
} from "express";

import authenticate from "../../middleware/authenticate";
import authorize from "../../middleware/authorize";
import validateRequest from "../../middleware/validateRequest";

import {
  OrderController,
} from "./order.controller";

import {
  OrderValidation,
} from "./order.validation";

const router =
  Router();

router.post(
  "/",
  authenticate,
  validateRequest(
    OrderValidation.createOrderValidationSchema
  ),
  OrderController.createOrder
);

router.get(
  "/my",
  authenticate,
  OrderController.getMyOrders
);

router.get(
  "/my/:orderId",
  authenticate,
  OrderController.getMyOrderById
);

router.get(
  "/seller",
  authenticate,
  authorize("FARMER"),
  OrderController.getSellerOrders
);

router.patch(
  "/seller/:orderId/fulfillment",
  authenticate,
  authorize("FARMER"),
  validateRequest(
    OrderValidation.updateFulfillmentValidationSchema
  ),
  OrderController.updateSellerFulfillment
);

router.get(
  "/admin/all",
  authenticate,
  authorize("ADMIN"),
  OrderController.getAllOrdersForAdmin
);

router.patch(
  "/admin/:orderId/status",
  authenticate,
  authorize("ADMIN"),
  validateRequest(
    OrderValidation.updateOrderStatusValidationSchema
  ),
  OrderController.updateOrderStatusByAdmin
);

export const OrderRoutes =
  router;