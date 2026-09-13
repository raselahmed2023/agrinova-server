import {
  z,
} from "zod";

import {
  AGRINOVA_BRANCHES,
  SUPPLY_CATEGORIES,
  SUPPLY_STATUSES,
  SUPPLY_UNITS,
} from "./supplyRequest.interface";

const categorySchema =
  z.enum(
    SUPPLY_CATEGORIES
  );

const unitSchema =
  z.enum(
    SUPPLY_UNITS
  );

const branchSchema =
  z.enum(
    AGRINOVA_BRANCHES
  );

const statusSchema =
  z.enum(
    SUPPLY_STATUSES
  );

/*
 * Accept:
 *
 * https://i.ibb.co/...
 *
 * OR your Next.js local upload fallback:
 *
 * /uploads/filename.jpg
 */
const imageUrlSchema =
  z
    .string()
    .trim()
    .refine(
      (value) => {
        if (
          /^\/uploads\/[A-Za-z0-9._-]+$/.test(
            value
          )
        ) {
          return true;
        }

        try {
          const url =
            new URL(value);

          return (
            url.protocol ===
              "http:" ||
            url.protocol ===
              "https:"
          );
        } catch {
          return false;
        }
      },
      {
        message:
          "Image must be a valid HTTP(S) URL or /uploads/ path",
      }
    );

const positiveIntegerString =
  z
    .string()
    .regex(
      /^\d+$/,
      "Must be a positive integer"
    )
    .refine(
      (value) =>
        Number(value) >
        0,
      {
        message:
          "Must be a positive integer",
      }
    );

const createSupplyRequestSchema =
  z.object({
    body: z.object({
      farmerName: z
        .string({
          message:
            "Farmer name is required",
        })
        .trim()
        .min(2)
        .max(100),

      phone: z
        .string({
          message:
            "Phone number is required",
        })
        .trim()
        .regex(
          /^01[3-9]\d{8}$/,
          "Invalid Bangladeshi phone number"
        ),

      farmerEmail: z
        .string()
        .trim()
        .email()
        .optional(),

      productName: z
        .string({
          message:
            "Product name is required",
        })
        .trim()
        .min(2)
        .max(120),

      category:
        categorySchema,

      quantity: z
        .number()
        .positive(
          "Quantity must be greater than 0"
        ),

      unit:
        unitSchema,

      expectedPrice: z
        .number()
        .min(
          0,
          "Expected price cannot be negative"
        ),

      division: z
        .string()
        .trim()
        .min(1),

      district: z
        .string()
        .trim()
        .min(1),

      upazila: z
        .string()
        .trim()
        .min(1),

      location: z
        .string()
        .trim()
        .min(2)
        .max(250),

      branch:
        branchSchema,

      notes: z
        .string()
        .trim()
        .max(1000)
        .optional(),

      images: z
        .array(
          imageUrlSchema
        )
        .max(5)
        .optional(),
    }),
  });

const updateStatusSchema =
  z.object({
    body: z
      .object({
        status:
          statusSchema,

        adminNote: z
          .string()
          .trim()
          .max(1500)
          .optional(),
      })
      .superRefine(
        (
          body,
          ctx
        ) => {
          if (
            body.status ===
              "REJECTED" &&
            !body.adminNote
              ?.trim()
          ) {
            ctx.addIssue({
              code:
                "custom",

              path: [
                "adminNote",
              ],

              message:
                "A rejection reason is required",
            });
          }
        }
      ),

    params: z.object({
      requestId: z
        .string()
        .min(1),
    }),
  });

const adminQuerySchema =
  z.object({
    query: z
      .object({
        status:
          statusSchema.optional(),

        branch:
          branchSchema.optional(),

        search: z
          .string()
          .trim()
          .max(200)
          .optional(),

        page:
          positiveIntegerString.optional(),

        limit:
          positiveIntegerString.optional(),
      })
      .optional(),
  });

const trackingSchema =
  z.object({
    params: z.object({
      trackingCode: z
        .string()
        .trim()
        .regex(
          /^AGN-[A-F0-9]{8}$/i,
          "Invalid tracking code"
        ),
    }),
  });

export const SupplyRequestValidation =
  {
    createSupplyRequestSchema,

    updateStatusSchema,

    adminQuerySchema,

    trackingSchema,
  };