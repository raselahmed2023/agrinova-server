import {
  Schema,
  model,
  Document,
} from "mongoose";

export interface IFinance
  extends Document {
  type: "Income" | "Expense";

  amount: number;

  category: string;

  farmId?: string;

  date: Date;

  description?: string;

  userId: string;
}

const financeSchema =
  new Schema<IFinance>(
    {
      type: {
        type: String,
        enum: [
          "Income",
          "Expense",
        ],
        required: [
          true,
          "Transaction type is required",
        ],
      },

      amount: {
        type: Number,
        required: [
          true,
          "Amount is required",
        ],
        min: [
          0.01,
          "Amount must be greater than 0",
        ],
      },

      category: {
        type: String,
        required: [
          true,
          "Category is required",
        ],
        trim: true,
      },

      farmId: {
        type: String,
        default: "",
      },

      date: {
        type: Date,
        required: [
          true,
          "Date is required",
        ],
      },

      description: {
        type: String,
        default: "",
        trim: true,
      },

      userId: {
        type: String,
        required: [
          true,
          "User ID is required",
        ],
        index: true,
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

export const Finance =
  model<IFinance>(
    "Finance",
    financeSchema
  );