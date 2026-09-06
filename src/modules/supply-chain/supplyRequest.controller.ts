import {
  Request,
  Response,
} from "express";

import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";

import {
  SupplyRequestService,
} from "./supplyRequest.service";

const getRequestId = (
  requestId:
    string | string[]
): string => {
  if (
    Array.isArray(
      requestId
    )
  ) {
    return requestId[0];
  }

  return requestId;
};

const createSupplyRequest =
  catchAsync(
    async (
      req: Request,
      res: Response
    ) => {
      const result =
        await SupplyRequestService
          .createSupplyRequestInDB(
            req.body
          );

      sendResponse(res, {
        statusCode: 201,
        success: true,

        message:
          "Product submitted for review. Do not deliver the product until AgriNova accepts your submission.",

        data: result,
      });
    }
  );

const getAllSupplyRequests =
  catchAsync(
    async (
      req: Request,
      res: Response
    ) => {
      const result =
        await SupplyRequestService
          .getAllSupplyRequestsFromDB(
            req.query
          );

      sendResponse(res, {
        statusCode: 200,
        success: true,
        message:
          "Supply requests fetched successfully",

        meta:
          result.meta,

        data:
          result.data,
      });
    }
  );

const getSupplyRequestById =
  catchAsync(
    async (
      req: Request,
      res: Response
    ) => {
      const requestId =
        getRequestId(
          req.params
            .requestId
        );

      const result =
        await SupplyRequestService
          .getSupplyRequestByIdFromDB(
            requestId
          );

      sendResponse(res, {
        statusCode: 200,
        success: true,
        message:
          "Supply request fetched successfully",
        data: result,
      });
    }
  );

const trackSupplyRequest =
  catchAsync(
    async (
      req: Request,
      res: Response
    ) => {
      const trackingCode =
        String(
          req.params
            .trackingCode
        );

      const result =
        await SupplyRequestService
          .trackSupplyRequestFromDB(
            trackingCode
          );

      sendResponse(res, {
        statusCode: 200,
        success: true,
        message:
          "Supply request status retrieved successfully",
        data: result,
      });
    }
  );

const updateSupplyRequestStatus =
  catchAsync(
    async (
      req: Request,
      res: Response
    ) => {
      const requestId =
        getRequestId(
          req.params
            .requestId
        );

      const result =
        await SupplyRequestService
          .updateSupplyRequestStatusInDB(
            requestId,

            req.body
              .status,

            req.body
              .adminNote
          );

      sendResponse(res, {
        statusCode: 200,
        success: true,
        message:
          "Supply request status updated successfully",
        data: result,
      });
    }
  );

export const SupplyRequestController =
  {
    createSupplyRequest,
    getAllSupplyRequests,
    getSupplyRequestById,
    trackSupplyRequest,
    updateSupplyRequestStatus,
  };