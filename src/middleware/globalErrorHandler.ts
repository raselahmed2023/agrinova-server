import type {
  ErrorRequestHandler,
} from "express";

import {
  ZodError,
} from "zod";

import AppError from "../utils/AppError";

type ErrorSource = {
  path:
    | string
    | number;

  message:
    string;
};

type MongoDuplicateKeyError = Error & {
  code?: number;

  keyValue?: Record<
    string,
    unknown
  >;
};

const isProduction =
  process.env.NODE_ENV ===
  "production";

const getSafeUnknownMessage =
  (
    err: unknown
  ) => {
    if (
      !isProduction &&
      err instanceof Error
    ) {
      return err.message;
    }

    return "Something went wrong!";
  };

const globalErrorHandler:
  ErrorRequestHandler = (
    err,
    _req,
    res,
    _next
  ) => {
    let statusCode =
      500;

    let message =
      getSafeUnknownMessage(
        err
      );

    let errorSources:
      ErrorSource[] = [
      {
        path: "",
        message:
          getSafeUnknownMessage(
            err
          ),
      },
    ];

    /* --------------------------------------------------------
       ZOD VALIDATION ERROR
    -------------------------------------------------------- */

    if (
      err instanceof
      ZodError
    ) {
      statusCode =
        400;

      message =
        "Validation Error";

      errorSources =
        err.issues.map(
          (
            issue
          ) => ({
            path:
              String(
                issue.path[
                  issue
                    .path
                    .length -
                    1
                ] ??
                  ""
              ),

            message:
              issue.message,
          })
        );
    }

    /* --------------------------------------------------------
       APPLICATION ERROR

       AppError messages are intentional and safe to return.
    -------------------------------------------------------- */

    else if (
      err instanceof
      AppError
    ) {
      statusCode =
        err.statusCode;

      message =
        err.message;

      errorSources =
        [
          {
            path: "",
            message:
              err.message,
          },
        ];
    }

    /* --------------------------------------------------------
       MONGOOSE VALIDATION ERROR
    -------------------------------------------------------- */

    else if (
      err?.name ===
      "ValidationError"
    ) {
      statusCode =
        400;

      message =
        "Validation Error";

      errorSources =
        Object.values(
          err.errors ||
            {}
        ).map(
          (
            value:
              any
          ) => ({
            path:
              value?.path ||
              "",

            message:
              value?.message ||
              "Invalid value",
          })
        );
    }

    /* --------------------------------------------------------
       MONGOOSE CAST ERROR
    -------------------------------------------------------- */

    else if (
      err?.name ===
      "CastError"
    ) {
      statusCode =
        400;

      message =
        "Invalid value";

      errorSources =
        [
          {
            path:
              err?.path ||
              "",

            message:
              err?.path
                ? `Invalid value for ${err.path}`
                : "Invalid value",
          },
        ];
    }

    /* --------------------------------------------------------
       MONGODB DUPLICATE KEY ERROR
    -------------------------------------------------------- */

    else if (
      (
        err as
          MongoDuplicateKeyError
      )?.code ===
      11000
    ) {
      const duplicateError =
        err as
          MongoDuplicateKeyError;

      const duplicateField =
        Object.keys(
          duplicateError
            .keyValue ||
            {}
        )[0] ||
        "";

      statusCode =
        409;

      message =
        duplicateField
          ? `${duplicateField} already exists`
          : "Duplicate value";

      errorSources =
        [
          {
            path:
              duplicateField,

            message,
          },
        ];
    }

    /* --------------------------------------------------------
       UNKNOWN / UNEXPECTED ERROR

       Do not expose internal exception messages in production.
    -------------------------------------------------------- */

    else if (
      err instanceof
      Error
    ) {
      statusCode =
        500;

      message =
        isProduction
          ? "Something went wrong!"
          : err.message;

      errorSources =
        [
          {
            path: "",

            message:
              isProduction
                ? "Internal server error"
                : err.message,
          },
        ];
    }

    /* --------------------------------------------------------
       RESPONSE
    -------------------------------------------------------- */

    return res
      .status(
        statusCode
      )
      .json({
        success:
          false,

        message,

        errorSources,

        stack:
          !isProduction
            ? err?.stack
            : undefined,
      });
  };

export default globalErrorHandler;
