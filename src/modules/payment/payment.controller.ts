import {
    Request,
    Response,
} from "express";

import catchAsync from "../../utils/catchAsync";
import AppError from "../../utils/AppError";
import sendResponse from "../../utils/sendResponse";

import {
    PaymentService,
} from "./payment.service";

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

const createStripeCheckoutSession =
    catchAsync(
        async (
            req: Request,
            res: Response
        ) => {
            const user =
                requireUser(req);

            const result =
                await PaymentService.createStripeCheckoutSession(
                    String(
                        req.body.orderId
                    ),
                    user.id,
                    user.email
                );

            sendResponse(res, {
                statusCode: 200,
                success: true,
                message:
                    "Stripe checkout session created successfully",
                data: result,
            });
        }
    );

const getStripeCheckoutSession =
    catchAsync(
        async (
            req: Request,
            res: Response
        ) => {
            const user =
                requireUser(req);

            const result =
                await PaymentService.getStripeCheckoutSession(
                    String(
                        req.params.sessionId
                    ),
                    user.id
                );

            sendResponse(res, {
                statusCode: 200,
                success: true,
                message:
                    "Stripe checkout session fetched successfully",
                data: result,
            });
        }
    );

const stripeWebhook =
    async (
        req: Request,
        res: Response
    ) => {
        const signature =
            req.headers[
                "stripe-signature"
            ];

        if (
            typeof signature !==
            "string"
        ) {
            res.status(400).json({
                success: false,
                message:
                    "Stripe signature is missing",
            });

            return;
        }

        if (
            !Buffer.isBuffer(
                req.body
            )
        ) {
            res.status(400).json({
                success: false,
                message:
                    "Stripe webhook requires raw request body",
            });

            return;
        }

        try {
            const result =
                await PaymentService.handleStripeWebhook(
                    req.body,
                    signature
                );

            res.status(200).json(
                result
            );
        } catch (
            error
        ) {
            if (
                error instanceof
                AppError
            ) {
                res.status(
                    error.statusCode
                ).json({
                    success: false,
                    message:
                        error.message,
                });

                return;
            }

            res.status(500).json({
                success: false,
                message:
                    "Stripe webhook processing failed",
            });
        }
    };

export const PaymentController = {
    createStripeCheckoutSession,

    getStripeCheckoutSession,

    stripeWebhook,
};