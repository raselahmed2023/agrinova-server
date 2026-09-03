import { Schema, model } from "mongoose";

const investmentProjectSchema = new Schema(
  {
    farmerId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    projectTitle: {
      type: String,
      required: true,
      trim: true,
    },

    nidNumber: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      required: true,
      trim: true,
    },

    requiredInvestment: {
      type: Number,
      required: true,
      min: 1,
    },

    projectedProfit: {
      type: Number,
      required: true,
      min: 0,
    },

    duration: {
      type: String,
      required: true,
      trim: true,
    },

    location: {
      type: String,
      required: true,
      trim: true,
    },

    projectImage: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    supportingDocument: {
      type: String,
      required: true,
      trim: true,
    },

    receivedInvestment: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: [
        "Pending Review",
        "Open for Investment",
        "Fully Funded",
        "Ongoing",
        "Completed",
        "Rejected",
        "Closed",
      ],
      default: "Pending Review",
    },

    adminNote: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

investmentProjectSchema.index({
  status: 1,
  createdAt: -1,
});

export const InvestmentProject = model(
  "InvestmentProject",
  investmentProjectSchema
);