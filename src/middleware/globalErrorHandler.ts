import { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import AppError from "../utils/AppError";

const globalErrorHandler: ErrorRequestHandler = (
  err,
  _req,
  res,
  _next
) => {
  let statusCode = 500;
  let message = "Something went wrong!";

  let errorSources: Array<{
    path: string | number;
    message: string;
  }> = [
    {
      path: "",
      message: "Something went wrong",
    },
  ];

  if (err instanceof ZodError) {
    statusCode = 400;
    message = "Validation Error";

    errorSources = err.issues.map((issue) => ({
      path: String(
        issue.path[issue.path.length - 1] ?? ""
      ),
      message: issue.message,
    }));
  } else if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;

    errorSources = [
      {
        path: "",
        message: err.message,
      },
    ];
  } else if (err?.name === "ValidationError") {
    statusCode = 400;
    message = "Mongoose Validation Error";

    errorSources = Object.values(
      err.errors || {}
    ).map((val: any) => ({
      path: val?.path || "",
      message: val?.message || "",
    }));
  } else if (err?.name === "CastError") {
    statusCode = 400;
    message = "Invalid ID format";

    errorSources = [
      {
        path: err.path,
        message: err.message,
      },
    ];
  } else if (err instanceof Error) {
    message = err.message;

    errorSources = [
      {
        path: "",
        message: err.message,
      },
    ];
  }

  return res.status(statusCode).json({
    success: false,
    message,
    errorSources,
    stack:
      process.env.NODE_ENV === "development"
        ? err?.stack
        : undefined,
  });
};

export default globalErrorHandler;