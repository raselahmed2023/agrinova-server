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

    if (!userId || userId === "undefined") {
      return res.status(400).json({
        success: false,
        message: "Valid User ID is required",
      });
    }


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

// DELETE: Delete a transaction by ID
export const deleteTransaction = async (req: Request, res: Response) => {
  try {
    const { transactionId } = req.params;

    const deletedTransaction = await Finance.findByIdAndDelete(transactionId);

    if (!deletedTransaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Transaction deleted successfully",
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete transaction",
    });
  }
};
// PATCH: Update transaction by ID
export const updateTransaction = async (req: Request, res: Response) => {
  try {
    const { transactionId } = req.params;
    const updateData = req.body;

    const updatedTransaction = await Finance.findByIdAndUpdate(
      transactionId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedTransaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Transaction updated successfully",
      data: updatedTransaction,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update transaction",
    });
  }
};