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

const createSupplyRequestSchema =
  z.object({
    body: z.object({
      farmerName: z
        .string({
          message:
            "Farmer name is required",
        })
        .trim()
        .min(
          2,
          "Farmer name is too short"
        )
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

      productName: z
        .string({
          message:
            "Product name is required",
        })
        .trim()
        .min(
          2,
          "Product name is too short"
        )
        .max(120),

      category:
        categorySchema,

      quantity: z
        .number({
          message:
            "Quantity is required",
        })
        .positive(
          "Quantity must be greater than 0"
        ),

      unit:
        unitSchema,

      expectedPrice: z
        .number({
          message:
            "Expected price is required",
        })
        .min(
          0,
          "Expected price cannot be negative"
        ),

      division: z
        .string()
        .trim()
        .min(
          1,
          "Division is required"
        ),

      district: z
        .string()
        .trim()
        .min(
          1,
          "District is required"
        ),

      upazila: z
        .string()
        .trim()
        .min(
          1,
          "Upazila is required"
        ),

      location: z
        .string()
        .trim()
        .min(
          2,
          "Address is required"
        )
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
          z.string().url()
        )
        .max(5)
        .optional(),
    }),
  });

const updateStatusSchema =
  z.object({
    body: z.object({
      status:
        statusSchema,
    }),

    params: z.object({
      requestId: z
        .string()
        .min(1),
    }),
  });

export const SupplyRequestValidation =
  {
    createSupplyRequestSchema,
    updateStatusSchema,
  };