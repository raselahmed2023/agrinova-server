import { z } from "zod";

const createPurchaseRequestSchema = z.object({
  body: z.object({
    productId: z
      .string()
      .trim()
      .min(1, "Product ID is required"),

    quantity: z
      .number()
      .positive(
        "Quantity must be greater than zero"
      ),

    deliveryLocation: z
      .string()
      .trim()
      .min(
        2,
        "Delivery location is required"
      )
      .max(300),

    note: z
      .string()
      .trim()
      .max(
        1000,
        "Note cannot exceed 1000 characters"
      )
      .optional(),
  }),
});

const updateStatusSchema = z.object({
  body: z.object({
    status: z.enum([
      "ACCEPTED",
      "REJECTED",
      "PROCESSING",
      "COMPLETED",
      "CANCELLED",
    ]),
  }),
});

export const PurchaseRequestValidation = {
  createPurchaseRequestSchema,
  updateStatusSchema,
};