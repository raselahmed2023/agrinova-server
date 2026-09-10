import {
  model,
  Schema,
} from "mongoose";

import {
  IInvestmentProject,
  INVESTMENT_CATEGORIES,
  INVESTMENT_STATUSES,
} from "./investment.interface";

const investmentSchema =
  new Schema<IInvestmentProject>(
    {
      projectCode: {
        type: String,
        required: true,
        unique: true,
        index: true,
      },

      farmerId: {
        type: String,
        required: true,
        index: true,
      },

      farmerName: {
        type: String,
        trim: true,
      },

      farmerEmail: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
      },

      projectName: {
        type: String,
        required: true,
        trim: true,
      },

      category: {
        type: String,
        enum: INVESTMENT_CATEGORIES,
        required: true,
      },

      requiredInvestment: {
        type: Number,
        required: true,
        min: 1,
      },

      ownContribution: {
        type: Number,
        default: 0,
        min: 0,
      },

      duration: {
        type: String,
        required: true,
        trim: true,
      },

      expectedReturn: {
        type: String,
        required: true,
        trim: true,
      },

      profitSharing: {
        type: String,
        required: true,
        trim: true,
      },

      estimatedRevenue: {
        type: Number,
        required: true,
        min: 0,
      },

      estimatedCost: {
        type: Number,
        required: true,
        min: 0,
      },

      estimatedProfit: {
        type: Number,
        required: true,
        min: 0,
      },

      division: {
        type: String,
        required: true,
        trim: true,
      },

      district: {
        type: String,
        required: true,
        trim: true,
        index: true,
      },

      upazila: {
        type: String,
        required: true,
        trim: true,
      },

      address: {
        type: String,
        required: true,
        trim: true,
      },

      description: {
        type: String,
        required: true,
        trim: true,
      },

      projectImage: {
        type: String,
        trim: true,
      },

      nidNumber: {
        type: String,
        required: true,
        trim: true,
      },

      nidFrontImage: {
        type: String,
        trim: true,
      },

      supportingDocument: {
        type: String,
        trim: true,
      },

      status: {
        type: String,
        enum: INVESTMENT_STATUSES,
        default: "PENDING_REVIEW",
        index: true,
      },

      adminNote: {
        type: String,
        default: "",
        trim: true,
      },

      reviewedAt: {
        type: Date,
      },

      isDeleted: {
        type: Boolean,
        default: false,
        index: true,
      },
    },
    {
      timestamps: true,
    }
  );

export const InvestmentProject =
  model<IInvestmentProject>(
    "InvestmentProject",
    investmentSchema
  );