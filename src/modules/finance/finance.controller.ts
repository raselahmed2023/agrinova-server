import { Request, Response } from "express";
import { Finance } from "./finance.model.js";

/* =========================================
   CREATE TRANSACTION
========================================= */

export const createTransaction = async (
  req: Request,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const {
      farmId,
      type,
      amount,
      category,
      date,
      description,
    } = req.body;

    if (
      !type ||
      !amount ||
      !category ||
      !date
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please provide type, amount, category and date",
      });
    }

    const transaction =
      await Finance.create({
        userId: req.user.id,
        farmId: farmId || "",
        type,
        amount: Number(amount),
        category,
        date,
        description:
          description || "",
      });

    return res.status(201).json({
      success: true,
      message:
        "Transaction created successfully",
      data: transaction,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to create transaction",
    });
  }
};

/* =========================================
   GET MY TRANSACTIONS
========================================= */

export const getUserTransactions = async (
  req: Request,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const transactions =
      await Finance.find({
        userId: req.user.id,
      }).sort({
        date: -1,
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      message:
        "Transactions fetched successfully",
      data: transactions,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch transactions",
    });
  }
};

/* =========================================
   UPDATE TRANSACTION
========================================= */

export const updateTransaction = async (
  req: Request,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { transactionId } =
      req.params;

    const allowedFields = [
      "farmId",
      "type",
      "amount",
      "category",
      "date",
      "description",
    ];

    const updateData: Record<
      string,
      unknown
    > = {};

    for (const field of allowedFields) {
      if (
        req.body[field] !==
        undefined
      ) {
        updateData[field] =
          req.body[field];
      }
    }

    const transaction =
      await Finance.findOneAndUpdate(
        {
          _id: transactionId,
          userId: req.user.id,
        },
        {
          $set: updateData,
        },
        {
          new: true,
          runValidators: true,
        }
      );

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Transaction updated successfully",
      data: transaction,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to update transaction",
    });
  }
};

/* =========================================
   DELETE TRANSACTION
========================================= */

export const deleteTransaction = async (
  req: Request,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { transactionId } =
      req.params;

    const transaction =
      await Finance.findOneAndDelete({
        _id: transactionId,
        userId: req.user.id,
      });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Transaction deleted successfully",
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to delete transaction",
    });
  }
};