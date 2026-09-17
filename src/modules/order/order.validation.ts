import { z } from "zod";

/* ============================================================
   PAGINATION
============================================================ */

const positiveIntegerString =
  z
    .string()
    .regex(
      /^\d+$/,
      "Must be a positive integer"
    )
    .refine(
      (value) =>
        Number(value) > 0,
      {
        message:
          "Must be a positive integer",
      }
    );

const getMyOrdersQueryValidationSchema =
  z.object({
    query: z
      .object({
        page:
          positiveIntegerString.optional(),

        limit:
          positiveIntegerString.optional(),
      })
      .optional(),
  });

/* ============================================================
   BANGLADESH PHONE
============================================================ */

const bangladeshPhoneSchema =
  z
    .string()
    .trim()
    .transform(
      (value) =>
        value.replace(
          /[\s-]/g,
          ""
        )
    )
    .refine(
      (value) =>
        /^01[3-9]\d{8}$/.test(
          value
        ) ||
        /^\+8801[3-9]\d{8}$/.test(
          value
        ),
      {
        message:
          "Enter a valid Bangladesh mobile number, e.g. 01712345678",
      }
    );

/* ============================================================
   SHIPPING ADDRESS
============================================================ */

const shippingAddressSchema =
  z.object({
    fullName: z
      .string()
      .trim()
      .min(
        2,
        "Full name is required"
      )
      .max(100),

    phone:
      bangladeshPhoneSchema,

    address: z
      .string()
      .trim()
      .min(
        5,
        "Address must be at least 5 characters"
      )
      .max(500),

    division: z
      .string()
      .trim()
      .min(
        1,
        "Division is required"
      )
      .max(100),

    district: z
      .string()
      .trim()
      .min(
        1,
        "District is required"
      )
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

/* ============================================================
   CREATE ORDER
============================================================ */

const createOrderValidationSchema =
  z.object({
    body: z.object({
      /**
       * Prevent duplicate COD/card order creation.
       */
      idempotencyKey: z
        .string()
        .trim()
        .min(
          16,
          "Invalid checkout request key"
        )
        .max(100),

      items: z
        .array(
          z.object({
            productId: z
              .string()
              .min(1),

            quantity: z
              .number()
              .int()
              .positive(),
          })
        )
        .min(
          1,
          "Order must contain at least one product"
        ),

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

/* ============================================================
   ORDER STATUS
============================================================ */

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

/* ============================================================
   FULFILLMENT STATUS
============================================================ */

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

/* ============================================================
   EXPORT
============================================================ */

export const OrderValidation = {
  getMyOrdersQueryValidationSchema,

  createOrderValidationSchema,

  updateOrderStatusValidationSchema,

  updateFulfillmentValidationSchema,
};