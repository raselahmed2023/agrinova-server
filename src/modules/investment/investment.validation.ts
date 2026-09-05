import {
  z,
} from "zod";

import {
  INVESTMENT_CATEGORIES,
  INVESTMENT_STATUSES,
} from "./investment.interface";

const categorySchema =
  z.enum(
    INVESTMENT_CATEGORIES
  );

const statusSchema =
  z.enum(
    INVESTMENT_STATUSES
  );

const createInvestmentProjectSchema =
  z.object({
    body: z.object({
      farmId: z
        .string()
        .trim()
        .min(1)
        .optional(),

      projectTitle: z
        .string({
          message:
            "Project title is required",
        })
        .trim()
        .min(3)
        .max(150),

      category:
        categorySchema,

      requiredInvestment: z
        .number({
          message:
            "Required investment is required",
        })
        .positive(
          "Required investment must be greater than 0"
        ),

      ownContribution: z
        .number()
        .min(
          0,
          "Own contribution cannot be negative"
        )
        .optional(),

      duration: z
        .string({
          message:
            "Project duration is required",
        })
        .trim()
        .min(1)
        .max(100),

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
        .min(
          1,
          "Upazila is required"
        )
        .max(100),

      location: z
        .string()
        .trim()
        .min(
          2,
          "Address is required"
        )
        .max(300),

      projectImage: z
        .string()
        .url()
        .optional(),

      description: z
        .string()
        .trim()
        .min(
          20,
          "Description must be at least 20 characters"
        )
        .max(5000),

      expectedBenefits: z
        .string()
        .trim()
        .min(
          10,
          "Expected benefits must be at least 10 characters"
        )
        .max(3000),
    }),
  });

const updateInvestmentProjectSchema =
  z.object({
    body: z
      .object({
        farmId: z
          .string()
          .trim()
          .min(1)
          .optional(),

        projectTitle: z
          .string()
          .trim()
          .min(3)
          .max(150)
          .optional(),

        category:
          categorySchema
            .optional(),

        requiredInvestment: z
          .number()
          .positive()
          .optional(),

        ownContribution: z
          .number()
          .min(0)
          .optional(),

        duration: z
          .string()
          .trim()
          .min(1)
          .max(100)
          .optional(),

        division: z
          .string()
          .trim()
          .min(1)
          .max(100)
          .optional(),

        district: z
          .string()
          .trim()
          .min(1)
          .max(100)
          .optional(),

        upazila: z
          .string()
          .trim()
          .min(1)
          .max(100)
          .optional(),

        location: z
          .string()
          .trim()
          .min(2)
          .max(300)
          .optional(),

        projectImage: z
          .string()
          .url()
          .optional(),

        description: z
          .string()
          .trim()
          .min(20)
          .max(5000)
          .optional(),

        expectedBenefits: z
          .string()
          .trim()
          .min(10)
          .max(3000)
          .optional(),
      })
      .refine(
        (body) =>
          Object.keys(body)
            .length > 0,
        {
          message:
            "At least one field is required",
        }
      ),
  });

const reviewInvestmentProjectSchema =
  z.object({
    body: z
      .object({
        status:
          statusSchema.refine(
            (status) =>
              status ===
                "APPROVED" ||
              status ===
                "REJECTED",
            {
              message:
                "Status must be APPROVED or REJECTED",
            }
          ),

        adminNote: z
          .string()
          .trim()
          .max(2000)
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
  });

const getAdminInvestmentProjectsSchema =
  z.object({
    query: z
      .object({
        status:
          statusSchema
            .optional(),

        search: z
          .string()
          .optional(),

        page: z
          .string()
          .optional(),

        limit: z
          .string()
          .optional(),
      })
      .optional(),
  });

export const InvestmentValidation =
  {
    createInvestmentProjectSchema,
    updateInvestmentProjectSchema,
    reviewInvestmentProjectSchema,
    getAdminInvestmentProjectsSchema,
  };