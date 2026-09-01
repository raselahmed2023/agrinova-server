import { Schema, model, Document } from "mongoose";

export interface IFinance extends Document {
  userId: string;
  farmId?: string;

  type: "Income" | "Expense";
  amount: number;
  category: string;

  date: Date;
  description?: string;
}

const financeSchema = new Schema<IFinance>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },

    farmId: {
      type: String,
      default: "",
      index: true,
    },

    type: {
      type: String,
      enum: ["Income", "Expense"],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },

    category: {
      type: String,
      required: true,
      trim: true,
    },

    date: {
      type: Date,
      required: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

financeSchema.index({
  userId: 1,
  date: -1,
});

financeSchema.index({
  userId: 1,
  farmId: 1,
});

export const Finance = model<IFinance>(
  "Finance",
  financeSchema
);