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
    authorize("FARMER"),
    validateRequest(
        OrderValidation.createOrderValidationSchema
    ),
    OrderController.createOrder
);

router.get(
    "/my",
    authenticate,
    authorize("FARMER"),
    OrderController.getMyOrders
);

router.get(
    "/my/:orderId",
    authenticate,
    authorize("FARMER"),
    OrderController.getMyOrderById
);

/**
 * FARMER / SELLER
 */
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

/**
 * ADMIN
 *
 * View all marketplace orders.
 */
router.get(
    "/admin/all",
    authenticate,
    authorize("ADMIN"),
    OrderController.getAllOrdersForAdmin
);

/**
 * ADMIN DELIVERY
 *
 * Update a specific seller fulfillment.
 */
router.patch(
    "/admin/:orderId/fulfillment/:sellerId",
    authenticate,
    authorize("ADMIN"),
    validateRequest(
        OrderValidation.updateFulfillmentValidationSchema
    ),
    OrderController.updateAdminFulfillment
);

/**
 * ADMIN MASTER ORDER STATUS
 */
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