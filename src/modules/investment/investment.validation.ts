import { z } from "zod";

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

const urlSchema =
  z.string().url().optional();

const createInvestmentProjectSchema =
  z.object({
    body: z.object({
      projectName: z
        .string()
        .trim()
        .min(
          3,
          "Project name must be at least 3 characters"
        )
        .max(150),

      category:
        categorySchema,

      requiredInvestment:
        z.number()
        .positive(),

      ownContribution:
        z.number()
        .min(0)
        .optional(),

      duration:
        z.string()
        .trim()
        .min(1)
        .max(100),

      expectedReturn:
        z.string()
        .trim()
        .min(1)
        .max(100),

      profitSharing:
        z.string()
        .trim()
        .min(1)
        .max(200),

      estimatedRevenue:
        z.number()
        .min(0),

      estimatedCost:
        z.number()
        .min(0),

      estimatedProfit:
        z.number()
        .min(0),

      division:
        z.string()
        .trim()
        .min(1),

      district:
        z.string()
        .trim()
        .min(1),

      upazila:
        z.string()
        .trim()
        .min(1),

      address:
        z.string()
        .trim()
        .min(2)
        .max(300),

      description:
        z.string()
        .trim()
        .min(20)
        .max(5000),

      projectImage:
        urlSchema,

      nidNumber:
        z.string()
        .trim()
        .min(5)
        .max(30),

      nidFrontImage:
        urlSchema,

      supportingDocument:
        urlSchema,
    }),
  });

const updateInvestmentProjectSchema =
  z.object({
    body: z.object({
      projectName:
        z.string()
        .trim()
        .min(3)
        .max(150)
        .optional(),

      category:
        categorySchema.optional(),

      requiredInvestment:
        z.number()
        .positive()
        .optional(),

      ownContribution:
        z.number()
        .min(0)
        .optional(),

      duration:
        z.string()
        .trim()
        .min(1)
        .max(100)
        .optional(),

      expectedReturn:
        z.string()
        .trim()
        .min(1)
        .max(100)
        .optional(),

      profitSharing:
        z.string()
        .trim()
        .min(1)
        .max(200)
        .optional(),

      estimatedRevenue:
        z.number()
        .min(0)
        .optional(),

      estimatedCost:
        z.number()
        .min(0)
        .optional(),

      estimatedProfit:
        z.number()
        .min(0)
        .optional(),

      division:
        z.string()
        .trim()
        .min(1)
        .optional(),

      district:
        z.string()
        .trim()
        .min(1)
        .optional(),

      upazila:
        z.string()
        .trim()
        .min(1)
        .optional(),

      address:
        z.string()
        .trim()
        .min(2)
        .max(300)
        .optional(),

      description:
        z.string()
        .trim()
        .min(20)
        .max(5000)
        .optional(),

      projectImage:
        urlSchema,

      nidNumber:
        z.string()
        .trim()
        .min(5)
        .max(30)
        .optional(),

      nidFrontImage:
        urlSchema,

      supportingDocument:
        urlSchema,
    }),
  });

const reviewInvestmentProjectSchema =
  z.object({
    body:
      z.object({
        status:
          statusSchema.refine(
            (value) =>
              value === "APPROVED" ||
              value === "REJECTED",
            {
              message:
                "Invalid review status",
            }
          ),

        adminNote:
          z.string()
          .trim()
          .max(2000)
          .optional(),
      })
      .superRefine(
        (data, ctx) => {
          if (
            data.status ===
              "REJECTED" &&
            !data.adminNote
          ) {
            ctx.addIssue({
              code: "custom",
              path: [
                "adminNote",
              ],
              message:
                "Rejection reason is required",
            });
          }
        }
      ),
  });

const getAdminInvestmentProjectsSchema =
  z.object({
    query:
      z.object({
        status:
          statusSchema.optional(),

        category:
          categorySchema.optional(),

        search:
          z.string().optional(),

        page:
          z.string().optional(),

        limit:
          z.string().optional(),
      })
      .optional(),
  });

export const InvestmentValidation = {
  createInvestmentProjectSchema,
  updateInvestmentProjectSchema,
  reviewInvestmentProjectSchema,
  getAdminInvestmentProjectsSchema,
};