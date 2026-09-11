import { model, Schema } from "mongoose";

import {
  FUNDING_STATUSES,
  IInvestmentApplication,
  IInvestmentProject,
  INVESTMENT_APPLICATION_STATUSES,
  INVESTMENT_CATEGORIES,
  INVESTMENT_PAYMENT_METHODS,
  INVESTMENT_PAYMENT_STATUSES,
  INVESTMENT_STATUSES,
} from "./investment.interface";

const investmentSchema = new Schema<IInvestmentProject>(
  {
    projectCode: { type: String, required: true, unique: true, index: true },
    farmerId: { type: String, required: true, index: true },
    farmerName: { type: String, trim: true },
    farmerEmail: { type: String, required: true, lowercase: true, trim: true },
    farmId: { type: String, default: "", index: true },
    farmName: { type: String, trim: true },
    projectName: { type: String, required: true, trim: true },
    category: { type: String, enum: INVESTMENT_CATEGORIES, required: true },
    requiredInvestment: { type: Number, required: true, min: 1 },
    minimumInvestment: { type: Number, required: true, min: 1, default: 1000 },
    ownContribution: { type: Number, default: 0, min: 0 },
    fundedAmount: { type: Number, default: 0, min: 0 },
    durationMonths: { type: Number, required: true, min: 1, max: 120, default: 6 },
    expectedReturnPercent: { type: Number, required: true, min: 0, max: 100, default: 0 },
    investorSharePercent: { type: Number, required: true, min: 0, max: 100, default: 0 },
    division: { type: String, required: true, trim: true },
    district: { type: String, required: true, trim: true, index: true },
    upazila: { type: String, required: true, trim: true },
    address: { type: String, trim: true, default: "" },
    description: { type: String, required: true, trim: true },
    useOfFunds: { type: String, required: true, trim: true, default: "Project operations" },
    projectImage: { type: String, trim: true },
    supportingDocument: { type: String, trim: true },
    status: { type: String, enum: INVESTMENT_STATUSES, default: "PENDING_REVIEW", index: true },
    fundingStatus: { type: String, enum: FUNDING_STATUSES, default: "OPEN", index: true },
    adminNote: { type: String, default: "", trim: true },
    reviewedAt: { type: Date },
    approvedAt: { type: Date },
    isDeleted: { type: Boolean, default: false, index: true },

    // Legacy fields
    duration: { type: String, trim: true },
    expectedReturn: { type: String, trim: true },
    profitSharing: { type: String, trim: true },
    estimatedRevenue: { type: Number, min: 0 },
    estimatedCost: { type: Number, min: 0 },
    estimatedProfit: { type: Number, min: 0 },
    nidNumber: { type: String, trim: true },
    nidFrontImage: { type: String, trim: true },
  },
  { timestamps: true }
);

const investmentApplicationSchema = new Schema<IInvestmentApplication>(
  {
    applicationCode: { type: String, required: true, unique: true, index: true },
    projectId: { type: String, required: true, index: true },
    projectCode: { type: String, required: true, index: true },
    projectName: { type: String, required: true, trim: true },
    projectOwnerId: { type: String, required: true, index: true },
    projectOwnerName: { type: String, trim: true },
    projectOwnerEmail: { type: String, required: true, lowercase: true, trim: true },
    investorId: { type: String, required: true, index: true },
    investorName: { type: String, trim: true },
    investorEmail: { type: String, required: true, lowercase: true, trim: true },
    amount: { type: Number, required: true, min: 1 },
    note: { type: String, trim: true, default: "" },
    paymentMethod: { type: String, enum: INVESTMENT_PAYMENT_METHODS, required: true },
    status: { type: String, enum: INVESTMENT_APPLICATION_STATUSES, default: "PENDING_REVIEW", index: true },
    adminNote: { type: String, trim: true, default: "" },
    reviewedAt: { type: Date },
    paymentStatus: { type: String, enum: INVESTMENT_PAYMENT_STATUSES, default: "NOT_STARTED", index: true },
    senderBankName: { type: String, trim: true },
    transactionReference: { type: String, trim: true },
    paymentProofUrl: { type: String, trim: true },
    stripeSessionId: { type: String, trim: true, index: true },
    stripePaymentIntentId: { type: String, trim: true },
    paymentAdminNote: { type: String, trim: true, default: "" },
    paymentReviewedAt: { type: Date },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

investmentApplicationSchema.index({ projectId: 1, investorId: 1, createdAt: -1 });

export const InvestmentProject = model<IInvestmentProject>(
  "InvestmentProject",
  investmentSchema
);

export const InvestmentApplication = model<IInvestmentApplication>(
  "InvestmentApplication",
  investmentApplicationSchema
);

