import {
  z,
} from "zod";

import {
  INVESTMENT_APPLICATION_STATUSES,
  INVESTMENT_CATEGORIES,
  INVESTMENT_PAYMENT_METHODS,
  INVESTMENT_PAYMENT_STATUSES,
  INVESTMENT_STATUSES,
} from "./investment.interface";

/* ============================================================
   COMMON
============================================================ */

const categorySchema =
  z.enum(
    INVESTMENT_CATEGORIES
  );

const statusSchema =
  z.enum(
    INVESTMENT_STATUSES
  );

const applicationStatusSchema =
  z.enum(
    INVESTMENT_APPLICATION_STATUSES
  );

const paymentMethodSchema =
  z.enum(
    INVESTMENT_PAYMENT_METHODS
  );

const paymentStatusSchema =
  z.enum(
    INVESTMENT_PAYMENT_STATUSES
  );

const uploadedFileUrl =
  z
    .string()
    .trim()
    .refine(
      (
        value
      ) =>
        /^https?:\/\//i.test(
          value
        ) ||
        value.startsWith(
          "/uploads/"
        ),
      {
        message:
          "Must be an http(s) URL or an uploaded /uploads/ path",
      }
    );

const optionalUrl =
  uploadedFileUrl
    .optional()
    .or(
      z.literal("")
    );

/* ============================================================
   PROJECT FIELDS
============================================================ */

const projectFields = {
  projectName:
    z
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
    z
      .number()
      .positive(
        "Funding goal must be greater than 0"
      ),

  minimumInvestment:
    z
      .number()
      .positive(
        "Minimum investment must be greater than 0"
      ),

  durationMonths:
    z
      .number()
      .int()
      .min(
        1,
        "Investment term must be at least 1 month"
      )
      .max(
        120,
        "Investment term cannot exceed 120 months"
      ),

  /**
   * Projected ROI for the complete investment term.
   */
  expectedReturnPercent:
    z
      .number()
      .positive(
        "Projected ROI must be greater than 0"
      )
      .max(
        500,
        "Projected ROI cannot exceed 500%"
      ),

  division:
    z
      .string()
      .trim()
      .min(
        1,
        "Division is required"
      )
      .max(100),

  district:
    z
      .string()
      .trim()
      .min(
        1,
        "District is required"
      )
      .max(100),

  upazila:
    z
      .string()
      .trim()
      .min(
        1,
        "Upazila is required"
      )
      .max(100),

  address:
    z
      .string()
      .trim()
      .max(300)
      .optional(),

  description:
    z
      .string()
      .trim()
      .min(
        20,
        "Project description must be at least 20 characters"
      )
      .max(3000),

  useOfFunds:
    z
      .string()
      .trim()
      .min(
        10,
        "Use of funds must be at least 10 characters"
      )
      .max(1200),

  projectImage:
    optionalUrl,

  supportingDocument:
    optionalUrl,
};

/* ============================================================
   CREATE PROJECT
============================================================ */

const createInvestmentProjectSchema =
  z.object({
    body:
      z
        .object(
          projectFields
        )
        .superRefine(
          (
            data,
            ctx
          ) => {
            if (
              data.minimumInvestment >
              data.requiredInvestment
            ) {
              ctx.addIssue({
                code:
                  "custom",

                path: [
                  "minimumInvestment",
                ],

                message:
                  "Minimum investment cannot exceed the funding goal",
              });
            }
          }
        ),
  });

/* ============================================================
   UPDATE PROJECT
============================================================ */

const updateInvestmentProjectSchema =
  z.object({
    body:
      z
        .object({
          projectName:
            projectFields
              .projectName
              .optional(),

          category:
            categorySchema
              .optional(),

          requiredInvestment:
            projectFields
              .requiredInvestment
              .optional(),

          minimumInvestment:
            projectFields
              .minimumInvestment
              .optional(),

          durationMonths:
            projectFields
              .durationMonths
              .optional(),

          expectedReturnPercent:
            projectFields
              .expectedReturnPercent
              .optional(),

          division:
            projectFields
              .division
              .optional(),

          district:
            projectFields
              .district
              .optional(),

          upazila:
            projectFields
              .upazila
              .optional(),

          address:
            z
              .string()
              .trim()
              .max(300)
              .optional(),

          description:
            projectFields
              .description
              .optional(),

          useOfFunds:
            projectFields
              .useOfFunds
              .optional(),

          projectImage:
            optionalUrl,

          supportingDocument:
            optionalUrl,
        })
        .superRefine(
          (
            data,
            ctx
          ) => {
            if (
              data.minimumInvestment !==
                undefined &&
              data.requiredInvestment !==
                undefined &&
              data.minimumInvestment >
                data.requiredInvestment
            ) {
              ctx.addIssue({
                code:
                  "custom",

                path: [
                  "minimumInvestment",
                ],

                message:
                  "Minimum investment cannot exceed the funding goal",
              });
            }
          }
        ),
  });

/* ============================================================
   PROJECT REVIEW
============================================================ */

const reviewInvestmentProjectSchema =
  z.object({
    body:
      z
        .object({
          status:
            statusSchema.refine(
              (
                value
              ) =>
                value ===
                  "APPROVED" ||
                value ===
                  "REJECTED",
              {
                message:
                  "Invalid review status",
              }
            ),

          adminNote:
            z
              .string()
              .trim()
              .max(2000)
              .optional(),
        })
        .superRefine(
          (
            data,
            ctx
          ) => {
            if (
              data.status ===
                "REJECTED" &&
              !data.adminNote?.trim()
            ) {
              ctx.addIssue({
                code:
                  "custom",

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

/* ============================================================
   CREATE INVESTMENT APPLICATION
============================================================ */

const createInvestmentApplicationSchema =
  z.object({
    body:
      z.object({
        amount:
          z
            .number()
            .positive(),

        nidNumber:
          z
            .string()
            .trim()
            .regex(
              /^\d{10,20}$/,
              "Enter a valid NID number using 10-20 digits"
            ),

        note:
          z
            .string()
            .trim()
            .max(800)
            .optional(),

        paymentMethod:
          paymentMethodSchema,
      }),
  });

/* ============================================================
   APPLICATION REVIEW
============================================================ */

const reviewInvestmentApplicationSchema =
  z.object({
    body:
      z
        .object({
          status:
            applicationStatusSchema.refine(
              (
                value
              ) =>
                value ===
                  "APPROVED" ||
                value ===
                  "REJECTED",
              {
                message:
                  "Invalid review status",
              }
            ),

          adminNote:
            z
              .string()
              .trim()
              .max(2000)
              .optional(),
        })
        .superRefine(
          (
            data,
            ctx
          ) => {
            if (
              data.status ===
                "REJECTED" &&
              !data.adminNote?.trim()
            ) {
              ctx.addIssue({
                code:
                  "custom",

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

/* ============================================================
   BANK PAYMENT
============================================================ */

const submitBankPaymentSchema =
  z.object({
    body:
      z.object({
        senderBankName:
          z
            .string()
            .trim()
            .min(2)
            .max(120),

        transactionReference:
          z
            .string()
            .trim()
            .min(3)
            .max(150),

        paymentProofUrl:
          uploadedFileUrl,
      }),
  });

const reviewBankPaymentSchema =
  z.object({
    body:
      z
        .object({
          paymentStatus:
            paymentStatusSchema.refine(
              (
                value
              ) =>
                value ===
                  "PAID" ||
                value ===
                  "PAYMENT_REJECTED",
              {
                message:
                  "Invalid bank payment review status",
              }
            ),

          paymentAdminNote:
            z
              .string()
              .trim()
              .max(2000)
              .optional(),
        })
        .superRefine(
          (
            data,
            ctx
          ) => {
            if (
              data.paymentStatus ===
                "PAYMENT_REJECTED" &&
              !data.paymentAdminNote?.trim()
            ) {
              ctx.addIssue({
                code:
                  "custom",

                path: [
                  "paymentAdminNote",
                ],

                message:
                  "Payment rejection reason is required",
              });
            }
          }
        ),
  });

/* ============================================================
   ADMIN PROJECT QUERY
============================================================ */

const getAdminInvestmentProjectsSchema =
  z.object({
    query:
      z
        .object({
          status:
            statusSchema
              .optional(),

          category:
            categorySchema
              .optional(),

          search:
            z
              .string()
              .optional(),

          page:
            z
              .string()
              .optional(),

          limit:
            z
              .string()
              .optional(),
        })
        .optional(),
  });

/* ============================================================
   ADMIN APPLICATION QUERY
============================================================ */

const getAdminInvestmentApplicationsSchema =
  z.object({
    query:
      z
        .object({
          status:
            applicationStatusSchema
              .optional(),

          paymentStatus:
            paymentStatusSchema
              .optional(),

          paymentMethod:
            paymentMethodSchema
              .optional(),

          search:
            z
              .string()
              .optional(),

          page:
            z
              .string()
              .optional(),

          limit:
            z
              .string()
              .optional(),
        })
        .optional(),
  });

export const InvestmentValidation = {
  createInvestmentProjectSchema,

  updateInvestmentProjectSchema,

  reviewInvestmentProjectSchema,

  createInvestmentApplicationSchema,

  reviewInvestmentApplicationSchema,

  submitBankPaymentSchema,

  reviewBankPaymentSchema,

  getAdminInvestmentProjectsSchema,

  getAdminInvestmentApplicationsSchema,
};