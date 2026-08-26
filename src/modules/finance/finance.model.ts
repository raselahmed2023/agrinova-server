import { Schema, model, Document } from "mongoose";

export interface IFinance extends Document {
  type: "Income" | "Expense";
  amount: number;
  category: string;
  farm?: string;
  date: Date;
  description?: string;
  userId: string;
}

const financeSchema = new Schema<IFinance>(
  {
    type: {
      type: String,
      enum: ["Income", "Expense"],
      required: [true, "Transaction type is required"],
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
    },
    farm: {
      type: String,
      default: "",
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
    },
    description: {
      type: String,
      default: "",
    },
    userId: {
      type: String,
      required: [true, "User ID is required"],
    },
  },
  { timestamps: true }
);

export const Finance = model<IFinance>("Finance", financeSchema);