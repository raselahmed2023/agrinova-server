import { z } from "zod";

const shippingAddressSchema =
  z.object({
    fullName: z
      .string()
      .trim()
      .min(1)
      .max(100),

    phone: z
      .string()
      .trim()
      .min(5)
      .max(30),

    address: z
      .string()
      .trim()
      .min(5)
      .max(500),

    division: z
      .string()
      .trim()
      .min(1)
      .max(100),

    district: z
      .string()
      .trim()
      .min(1)
      .max(100),

    upazila: z
      .string()
      .trim()
      .max(100)
      .optional(),

    postalCode: z
      .string()
      .trim()
      .max(20)
      .optional(),
  });

const createOrderValidationSchema =
  z.object({
    body: z.object({
      items: z
        .array(
          z.object({
            productId: z
              .string()
              .min(1),

            quantity: z
              .number()
              .positive(),
          })
        )
        .min(1),

      shippingAddress:
        shippingAddressSchema,

      paymentMethod: z.enum([
        "cod",
        "card",
      ]),

      notes: z
        .string()
        .trim()
        .max(1000)
        .optional(),
    }),
  });

const updateOrderStatusValidationSchema =
  z.object({
    body: z.object({
      status: z.enum([
        "pending",
        "confirmed",
        "processing",
        "partially_fulfilled",
        "ready_for_pickup",
        "picked_up",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ]),
    }),
  });

const updateFulfillmentValidationSchema =
  z.object({
    body: z.object({
      status: z.enum([
        "pending",
        "confirmed",
        "processing",
        "ready_for_pickup",
        "picked_up",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ]),

      deliveryPartner: z
        .object({
          name: z
            .string()
            .trim()
            .max(100)
            .optional(),

          phone: z
            .string()
            .trim()
            .max(30)
            .optional(),
        })
        .optional(),
    }),
  });

export const OrderValidation = {
  createOrderValidationSchema,

  updateOrderStatusValidationSchema,

  updateFulfillmentValidationSchema,
};