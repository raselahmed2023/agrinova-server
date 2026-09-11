import { z } from "zod";

import {
  INVESTMENT_APPLICATION_STATUSES,
  INVESTMENT_CATEGORIES,
  INVESTMENT_PAYMENT_METHODS,
  INVESTMENT_PAYMENT_STATUSES,
  INVESTMENT_STATUSES,
} from "./investment.interface";

const categorySchema = z.enum(INVESTMENT_CATEGORIES);
const statusSchema = z.enum(INVESTMENT_STATUSES);
const applicationStatusSchema = z.enum(INVESTMENT_APPLICATION_STATUSES);
const paymentMethodSchema = z.enum(INVESTMENT_PAYMENT_METHODS);
const paymentStatusSchema = z.enum(INVESTMENT_PAYMENT_STATUSES);
const uploadedFileUrl = z.string().trim().refine(
  (value) => /^https?:\/\//i.test(value) || value.startsWith("/uploads/"),
  { message: "Must be an http(s) URL or an uploaded /uploads/ path" }
);
const optionalUrl = uploadedFileUrl.optional().or(z.literal(""));

const projectBody = {
  projectName: z.string().trim().min(3).max(150),
  category: categorySchema,
  requiredInvestment: z.number().positive(),
  minimumInvestment: z.number().positive(),
  durationMonths: z.number().int().min(1).max(120),
  description: z.string().trim().min(20).max(3000),
  useOfFunds: z.string().trim().min(10).max(1200),
  projectImage: optionalUrl,
  supportingDocument: optionalUrl,
};

const createInvestmentProjectSchema = z.object({
  body: z.object({ farmId: z.string().trim().min(1, "Farm is required"), ...projectBody }).superRefine((data, ctx) => {
    if (data.minimumInvestment > data.requiredInvestment) {
      ctx.addIssue({
        code: "custom",
        path: ["minimumInvestment"],
        message: "Minimum investment cannot exceed the funding goal",
      });
    }
  }),
});

const updateInvestmentProjectSchema = z.object({
  body: z.object({
    projectName: projectBody.projectName.optional(),
    category: categorySchema.optional(),
    requiredInvestment: projectBody.requiredInvestment.optional(),
    minimumInvestment: projectBody.minimumInvestment.optional(),
    durationMonths: projectBody.durationMonths.optional(),
    description: projectBody.description.optional(),
    useOfFunds: projectBody.useOfFunds.optional(),
    projectImage: optionalUrl,
    supportingDocument: optionalUrl,
  }),
});

const reviewInvestmentProjectSchema = z.object({
  body: z.object({
    status: statusSchema.refine((value) => value === "APPROVED" || value === "REJECTED", {
      message: "Invalid review status",
    }),
    adminNote: z.string().trim().max(2000).optional(),
  }).superRefine((data, ctx) => {
    if (data.status === "REJECTED" && !data.adminNote?.trim()) {
      ctx.addIssue({ code: "custom", path: ["adminNote"], message: "Rejection reason is required" });
    }
  }),
});

const createInvestmentApplicationSchema = z.object({
  body: z.object({
    amount: z.number().positive(),
    nidNumber: z.string().trim().regex(/^\d{10,20}$/, "Enter a valid NID number using 10-20 digits"),
    note: z.string().trim().max(800).optional(),
    paymentMethod: paymentMethodSchema,
  }),
});

const reviewInvestmentApplicationSchema = z.object({
  body: z.object({
    status: applicationStatusSchema.refine((value) => value === "APPROVED" || value === "REJECTED", {
      message: "Invalid review status",
    }),
    adminNote: z.string().trim().max(2000).optional(),
  }).superRefine((data, ctx) => {
    if (data.status === "REJECTED" && !data.adminNote?.trim()) {
      ctx.addIssue({ code: "custom", path: ["adminNote"], message: "Rejection reason is required" });
    }
  }),
});

const submitBankPaymentSchema = z.object({
  body: z.object({
    senderBankName: z.string().trim().min(2).max(120),
    transactionReference: z.string().trim().min(3).max(150),
    paymentProofUrl: uploadedFileUrl,
  }),
});

const reviewBankPaymentSchema = z.object({
  body: z.object({
    paymentStatus: paymentStatusSchema.refine((value) => value === "PAID" || value === "PAYMENT_REJECTED", {
      message: "Invalid bank payment review status",
    }),
    paymentAdminNote: z.string().trim().max(2000).optional(),
  }).superRefine((data, ctx) => {
    if (data.paymentStatus === "PAYMENT_REJECTED" && !data.paymentAdminNote?.trim()) {
      ctx.addIssue({ code: "custom", path: ["paymentAdminNote"], message: "Payment rejection reason is required" });
    }
  }),
});

const getAdminInvestmentProjectsSchema = z.object({
  query: z.object({
    status: statusSchema.optional(),
    category: categorySchema.optional(),
    search: z.string().optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
  }).optional(),
});

const getAdminInvestmentApplicationsSchema = z.object({
  query: z.object({
    status: applicationStatusSchema.optional(),
    paymentStatus: paymentStatusSchema.optional(),
    paymentMethod: paymentMethodSchema.optional(),
    search: z.string().optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
  }).optional(),
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