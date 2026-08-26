import { Request, Response } from "express";
import { Finance } from "./finance.model";

// POST: Create new transaction
export const createTransaction = async (req: Request, res: Response) => {
  try {
    const { type, amount, category, farm, date, description, userId } = req.body;

    if (!type || !amount || !category || !date || !userId) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields: type, amount, category, date, userId",
      });
    }

    const newTransaction = await Finance.create({
      type,
      amount,
      category,
      farm,
      date,
      description,
      userId,
    });

    return res.status(201).json({
      success: true,
      message: "Transaction created successfully",
      data: newTransaction,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create transaction",
    });
  }
};

// GET: Fetch transactions by userId
export const getUserTransactions = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // userId না থাকলে BadRequest রিটার্ন করবে
    if (!userId || userId === "undefined") {
      return res.status(400).json({
        success: false,
        message: "Valid User ID is required",
      });
    }

    // নির্দিষ্ট userId-এর ট্রানজ্যাকশন তারিখ অনুযায়ী (Newest First) সর্ট করে নিয়ে আসা
    const transactions = await Finance.find({ userId }).sort({ date: -1 });

    return res.status(200).json({
      success: true,
      message: "Transactions fetched successfully",
      data: transactions,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch transactions",
    });
  }
};