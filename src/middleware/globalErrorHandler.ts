import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { ZodError } from "zod";

export const globalErrorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (error instanceof ZodError) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "Image size must be 5MB or less",
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  if (error instanceof Error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }

  return res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};