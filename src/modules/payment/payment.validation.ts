import {
    z,
} from "zod";

const createStripeCheckoutSessionValidationSchema =
    z.object({
        body: z.object({
            orderId: z
                .string()
                .min(
                    1,
                    "Order ID is required"
                ),
        }),
    });

export const PaymentValidation = {
    createStripeCheckoutSessionValidationSchema,
};