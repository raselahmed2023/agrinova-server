import { z } from "zod";

import {
  AGRINOVA_BRANCHES,
  SUPPLY_CATEGORIES,
  SUPPLY_STATUSES,
  SUPPLY_UNITS,
} from "./supplyRequest.interface";

const categorySchema = z.enum(SUPPLY_CATEGORIES);
const unitSchema = z.enum(SUPPLY_UNITS);
const branchSchema = z.enum(AGRINOVA_BRANCHES);
const statusSchema = z.enum(SUPPLY_STATUSES);

const positiveIntegerStringSchema = z
  .string()
  .trim()
  .regex(/^[1-9]\d*$/, "Must be a positive integer");

const createSupplyRequestSchema = z.object({
  body: z.object({
    farmerName: z
      .string({
        message: "Farmer name is required",
      })
      .trim()
      .min(2, "Farmer name must be at least 2 characters")
      .max(100, "Farmer name cannot exceed 100 characters"),

    phone: z
      .string({
        message: "Phone number is required",
      })
      .trim()
      .regex(
        /^01[3-9]\d{8}$/,
        "Invalid Bangladeshi phone number",
      ),

    productName: z
      .string({
        message: "Product name is required",
      })
      .trim()
      .min(2, "Product name must be at least 2 characters")
      .max(120, "Product name cannot exceed 120 characters"),

    category: categorySchema,

    quantity: z
      .number({
        message: "Quantity is required",
      })
      .finite("Quantity must be a valid number")
      .positive("Quantity must be greater than 0"),

    unit: unitSchema,

    expectedPrice: z
      .number({
        message: "Expected price is required",
      })
      .finite("Expected price must be a valid number")
      .positive("Expected price must be greater than 0"),

    division: z
      .string({
        message: "Division is required",
      })
      .trim()
      .min(1, "Division is required")
      .max(100, "Division cannot exceed 100 characters"),

    district: z
      .string({
        message: "District is required",
      })
      .trim()
      .min(1, "District is required")
      .max(100, "District cannot exceed 100 characters"),

    upazila: z
      .string({
        message: "Upazila is required",
      })
      .trim()
      .min(1, "Upazila is required")
      .max(100, "Upazila cannot exceed 100 characters"),

    location: z
      .string({
        message: "Location is required",
      })
      .trim()
      .min(2, "Location must be at least 2 characters")
      .max(250, "Location cannot exceed 250 characters"),

    branch: branchSchema,

    notes: z
      .string()
      .trim()
      .max(1000, "Notes cannot exceed 1000 characters")
      .optional(),

    images: z
      .array(z.string().url("Each image must be a valid URL"))
      .max(5, "You can upload a maximum of 5 images")
      .optional(),
  }),
});

const updateStatusSchema = z.object({
  body: z
    .object({
      status: statusSchema,

      adminNote: z
        .string()
        .trim()
        .max(
          1500,
          "Admin note cannot exceed 1500 characters",
        )
        .optional(),
    })
    .superRefine((body, ctx) => {
      if (
        body.status === "REJECTED" &&
        !body.adminNote?.trim()
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["adminNote"],
          message: "A rejection reason is required",
        });
      }
    }),

  params: z.object({
    requestId: z
      .string()
      .trim()
      .min(1, "Request ID is required"),
  }),
});

const adminQuerySchema = z.object({
  query: z
    .object({
      status: statusSchema.optional(),

      branch: branchSchema.optional(),

      search: z
        .string()
        .trim()
        .max(120, "Search cannot exceed 120 characters")
        .optional(),

      page: positiveIntegerStringSchema.optional(),

      limit: positiveIntegerStringSchema.optional(),
    })
    .optional(),
});

const farmerQuerySchema = z.object({
  query: z
    .object({
      status: statusSchema.optional(),

      page: positiveIntegerStringSchema.optional(),

      limit: positiveIntegerStringSchema.optional(),
    })
    .optional(),
});

const trackingSchema = z.object({
  params: z.object({
    trackingCode: z
      .string()
      .trim()
      .regex(
        /^AGN-[A-F0-9]{8}$/i,
        "Invalid tracking code",
      ),
  }),
});

export const SupplyRequestValidation = {
  createSupplyRequestSchema,
  updateStatusSchema,
  adminQuerySchema,
  farmerQuerySchema,
  trackingSchema,
};
