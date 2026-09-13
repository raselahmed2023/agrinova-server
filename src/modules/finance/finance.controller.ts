import { Request, Response } from "express";
import { isValidObjectId } from "mongoose";

import { Farm } from "../../app/modules/farm/farm.model.js";
import { Finance } from "./finance.model.js";

class FinanceInputError extends Error {
  statusCode: number;

  constructor(
    statusCode: number,
    message: string
  ) {
    super(message);
    this.statusCode = statusCode;
  }
}

const normalizeType = (
  value: unknown
): "Income" | "Expense" => {
  const type = String(
    value || ""
  )
    .trim()
    .toLowerCase();

  if (type === "income") {
    return "Income";
  }

  if (type === "expense") {
    return "Expense";
  }

  throw new FinanceInputError(
    400,
    "Transaction type must be Income or Expense"
  );
};

const normalizeAmount = (
  value: unknown
): number => {
  const amount =
    Number(value);

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    throw new FinanceInputError(
      400,
      "Amount must be a number greater than 0"
    );
  }

  return amount;
};

const normalizeCategory = (
  value: unknown
): string => {
  if (
    typeof value !==
    "string"
  ) {
    throw new FinanceInputError(
      400,
      "Category is required"
    );
  }

  const category =
    value.trim();

  if (!category) {
    throw new FinanceInputError(
      400,
      "Category is required"
    );
  }

  if (
    category.length >
    100
  ) {
    throw new FinanceInputError(
      400,
      "Category cannot exceed 100 characters"
    );
  }

  return category;
};

const normalizeDate = (
  value: unknown
): Date => {
  if (
    typeof value !==
      "string" ||
    !value.trim()
  ) {
    throw new FinanceInputError(
      400,
      "Transaction date is required"
    );
  }

  const input =
    value.trim();

  const dateOnlyMatch =
    input.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

  if (dateOnlyMatch) {
    const year =
      Number(
        dateOnlyMatch[1]
      );

    const month =
      Number(
        dateOnlyMatch[2]
      );

    const day =
      Number(
        dateOnlyMatch[3]
      );

    const date =
      new Date(
        Date.UTC(
          year,
          month - 1,
          day
        )
      );

    if (
      date.getUTCFullYear() !==
        year ||
      date.getUTCMonth() !==
        month - 1 ||
      date.getUTCDate() !==
        day
    ) {
      throw new FinanceInputError(
        400,
        "Transaction date is invalid"
      );
    }

    return date;
  }

  const date =
    new Date(input);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    throw new FinanceInputError(
      400,
      "Transaction date is invalid"
    );
  }

  return date;
};

const normalizeDescription =
  (
    value: unknown
  ): string => {
    if (
      value ===
        undefined ||
      value === null
    ) {
      return "";
    }

    if (
      typeof value !==
      "string"
    ) {
      throw new FinanceInputError(
        400,
        "Description must be text"
      );
    }

    const description =
      value.trim();

    if (
      description.length >
      500
    ) {
      throw new FinanceInputError(
        400,
        "Description cannot exceed 500 characters"
      );
    }

    return description;
  };

const normalizeFarmId =
  async (
    value: unknown,
    farmerId: string
  ): Promise<string> => {
    if (
      value ===
        undefined ||
      value === null ||
      value === ""
    ) {
      return "";
    }

    if (
      typeof value !==
        "string" ||
      !isValidObjectId(
        value
      )
    ) {
      throw new FinanceInputError(
        400,
        "Selected farm is invalid"
      );
    }

  
    const ownedFarm =
      await Farm.exists({
        _id: value,
        farmerId,
      });

    if (!ownedFarm) {
      throw new FinanceInputError(
        400,
        "Selected farm does not belong to your account"
      );
    }

    return value;
  };

const sendControllerError =
  (
    res: Response,
    error: unknown,
    fallback: string
  ) => {
    if (
      error instanceof
      FinanceInputError
    ) {
      return res
        .status(
          error.statusCode
        )
        .json({
          success: false,
          message:
            error.message,
        });
    }

    const message =
      error instanceof
      Error
        ? error.message
        : fallback;

    return res
      .status(500)
      .json({
        success: false,

        message:
          message ||
          fallback,
      });
  };



export const createTransaction =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      if (!req.user) {
        return res
          .status(401)
          .json({
            success:
              false,

            message:
              "Authentication required",
          });
      }

      const transaction =
        await Finance.create({
          
          userId:
            req.user.id,

          farmId:
            await normalizeFarmId(
              req.body
                ?.farmId,
              req.user.id
            ),

          type:
            normalizeType(
              req.body
                ?.type
            ),

          amount:
            normalizeAmount(
              req.body
                ?.amount
            ),

          category:
            normalizeCategory(
              req.body
                ?.category
            ),

          date:
            normalizeDate(
              req.body
                ?.date
            ),

          description:
            normalizeDescription(
              req.body
                ?.description
            ),
        });

      return res
        .status(201)
        .json({
          success: true,

          message:
            "Transaction created successfully",

          data:
            transaction,
        });
    } catch (error) {
      return sendControllerError(
        res,
        error,
        "Failed to create transaction"
      );
    }
  };



export const getUserTransactions =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      if (!req.user) {
        return res
          .status(401)
          .json({
            success:
              false,

            message:
              "Authentication required",
          });
      }

      
      const transactions =
        await Finance.find({
          userId:
            req.user.id,
        })
          .sort({
            date: -1,
            createdAt: -1,
          })
          .lean();

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Transactions fetched successfully",

          data:
            transactions,
        });
    } catch (error) {
      return sendControllerError(
        res,
        error,
        "Failed to fetch transactions"
      );
    }
  };



export const updateTransaction =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      if (!req.user) {
        return res
          .status(401)
          .json({
            success:
              false,

            message:
              "Authentication required",
          });
      }

      const transactionId =
        String(
          req.params
            .transactionId ||
            ""
        );

      if (
        !isValidObjectId(
          transactionId
        )
      ) {
        throw new FinanceInputError(
          400,
          "Invalid transaction ID"
        );
      }

      
      const updateData:
        Record<
          string,
          unknown
        > = {};

      if (
        req.body
          ?.farmId !==
        undefined
      ) {
        updateData.farmId =
          await normalizeFarmId(
            req.body
              .farmId,
            req.user.id
          );
      }

      if (
        req.body?.type !==
        undefined
      ) {
        updateData.type =
          normalizeType(
            req.body.type
          );
      }

      if (
        req.body
          ?.amount !==
        undefined
      ) {
        updateData.amount =
          normalizeAmount(
            req.body.amount
          );
      }

      if (
        req.body
          ?.category !==
        undefined
      ) {
        updateData.category =
          normalizeCategory(
            req.body.category
          );
      }

      if (
        req.body?.date !==
        undefined
      ) {
        updateData.date =
          normalizeDate(
            req.body.date
          );
      }

      if (
        req.body
          ?.description !==
        undefined
      ) {
        
        updateData.description =
          normalizeDescription(
            req.body
              .description
          );
      }

      if (
        !Object.keys(
          updateData
        ).length
      ) {
        throw new FinanceInputError(
          400,
          "No valid fields were provided"
        );
      }

      const transaction =
        await Finance.findOneAndUpdate(
          {
            _id:
              transactionId,

            
            userId:
              req.user.id,
          },

          {
            $set:
              updateData,
          },

          {
            new: true,
            runValidators:
              true,
          }
        );

      if (!transaction) {
        return res
          .status(404)
          .json({
            success:
              false,

            message:
              "Transaction not found",
          });
      }

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Transaction updated successfully",

          data:
            transaction,
        });
    } catch (error) {
      return sendControllerError(
        res,
        error,
        "Failed to update transaction"
      );
    }
  };



export const deleteTransaction =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      if (!req.user) {
        return res
          .status(401)
          .json({
            success:
              false,

            message:
              "Authentication required",
          });
      }

      const transactionId =
        String(
          req.params
            .transactionId ||
            ""
        );

      if (
        !isValidObjectId(
          transactionId
        )
      ) {
        throw new FinanceInputError(
          400,
          "Invalid transaction ID"
        );
      }

      const transaction =
        await Finance.findOneAndDelete(
          {
            _id:
              transactionId,

            
            userId:
              req.user.id,
          }
        );

      if (!transaction) {
        return res
          .status(404)
          .json({
            success:
              false,

            message:
              "Transaction not found",
          });
      }

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Transaction deleted successfully",

          data: {
            transactionId,
          },
        });
    } catch (error) {
      return sendControllerError(
        res,
        error,
        "Failed to delete transaction"
      );
    }
  };