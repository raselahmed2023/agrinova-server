import {
    Request,
    Response,
} from "express";

import catchAsync from "../../utils/catchAsync";
import AppError from "../../utils/AppError";
import sendResponse from "../../utils/sendResponse";

import {
    OrderService,
} from "./order.service";

const requireUser = (
    req: Request
) => {
    if (!req.user) {
        throw new AppError(
            401,
            "Authentication required"
        );
    }

    return req.user;
};

const createOrder =
    catchAsync(
        async (
            req: Request,
            res: Response
        ) => {
            const user =
                requireUser(req);

            const result =
                await OrderService.createOrderInDB(
                    {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                    },
                    req.body
                );

            sendResponse(res, {
                statusCode: 201,
                success: true,
                message:
                    "Order created successfully",
                data: result,
            });
        }
    );

const getMyOrders =
    catchAsync(
        async (
            req: Request,
            res: Response
        ) => {
            const user =
                requireUser(req);

            const result =
                await OrderService.getMyOrdersFromDB(
                    user.id
                );

            sendResponse(res, {
                statusCode: 200,
                success: true,
                message:
                    "Orders fetched successfully",
                data: result,
            });
        }
    );

const getMyOrderById =
    catchAsync(
        async (
            req: Request,
            res: Response
        ) => {
            const user =
                requireUser(req);

            const result =
                await OrderService.getMyOrderByIdFromDB(
                    String(
                        req.params.orderId
                    ),
                    user.id
                );

            sendResponse(res, {
                statusCode: 200,
                success: true,
                message:
                    "Order fetched successfully",
                data: result,
            });
        }
    );

const getSellerOrders =
    catchAsync(
        async (
            req: Request,
            res: Response
        ) => {
            const user =
                requireUser(req);

            const result =
                await OrderService.getSellerOrdersFromDB(
                    user.id,
                    user.email
                );

            sendResponse(res, {
                statusCode: 200,
                success: true,
                message:
                    "Seller orders fetched successfully",
                data: result,
            });
        }
    );

const updateSellerFulfillment =
    catchAsync(
        async (
            req: Request,
            res: Response
        ) => {
            const user =
                requireUser(req);

            const result =
                await OrderService.updateSellerFulfillment(
                    String(
                        req.params.orderId
                    ),
                    user.id,
                    user.email,
                    req.body.status
                );

            sendResponse(res, {
                statusCode: 200,
                success: true,
                message:
                    "Fulfillment updated successfully",
                data: result,
            });
        }
    );

/**
 * ADMIN DELIVERY FULFILLMENT
 *
 * Admin updates the delivery
 * status for a specific seller.
 */
const updateAdminFulfillment =
    catchAsync(
        async (
            req: Request,
            res: Response
        ) => {
            const result =
                await OrderService.updateAdminFulfillment(
                    String(
                        req.params.orderId
                    ),
                    String(
                        req.params.sellerId
                    ),
                    req.body.status,
                    req.body.deliveryPartner
                );

            sendResponse(res, {
                statusCode: 200,
                success: true,
                message:
                    "Delivery fulfillment updated successfully",
                data: result,
            });
        }
    );

const getAllOrdersForAdmin =
    catchAsync(
        async (
            _req: Request,
            res: Response
        ) => {
            const result =
                await OrderService.getAllOrdersForAdmin();

            sendResponse(res, {
                statusCode: 200,
                success: true,
                message:
                    "Marketplace orders fetched successfully",
                data: result,
            });
        }
    );

const updateOrderStatusByAdmin =
    catchAsync(
        async (
            req: Request,
            res: Response
        ) => {
            const result =
                await OrderService.updateOrderStatusByAdmin(
                    String(
                        req.params.orderId
                    ),
                    req.body.status
                );

            sendResponse(res, {
                statusCode: 200,
                success: true,
                message:
                    "Order status updated successfully",
                data: result,
            });
        }
    );

export const OrderController = {
    createOrder,

    getMyOrders,

    getMyOrderById,

    getSellerOrders,

    updateSellerFulfillment,

    updateAdminFulfillment,

    getAllOrdersForAdmin,

    updateOrderStatusByAdmin,
};