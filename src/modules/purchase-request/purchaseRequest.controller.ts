import type { Request, Response } from "express";

import AppError from "../../utils/AppError";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";

import type { TPurchaseRequestStatus } from "./purchaseRequest.interface";
import { PurchaseRequestService } from "./purchaseRequest.service";

const getHeaderValue = (
  req: Request,
  headerName: string
): string | undefined => {
  const value = req.headers[headerName];

  if (Array.isArray(value)) {
    return value[0];
  }

  if (typeof value === "string") {
    return value;
  }

  return undefined;
};

const getUserEmail = (req: Request): string => {
  const email =
    getHeaderValue(req, "x-user-email") ||
    getHeaderValue(req, "user-email");

  if (!email) {
    throw new AppError(401, "User email is required");
  }

  return email;
};

const createPurchaseRequest = catchAsync(
  async (req: Request, res: Response) => {
    const email = getUserEmail(req);

    const buyerName = getHeaderValue(req, "x-user-name");
    const buyerId = getHeaderValue(req, "x-user-id");

    const result =
      await PurchaseRequestService.createPurchaseRequest(
        req.body,
        {
          email,
          name: buyerName,
          id: buyerId,
        }
      );

    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: "Purchase request sent successfully",
      data: result,
    });
  }
);

const getSentRequests = catchAsync(
  async (req: Request, res: Response) => {
    const email = getUserEmail(req);

    const result =
      await PurchaseRequestService.getSentRequests(email);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Sent purchase requests retrieved successfully",
      data: result,
    });
  }
);

const getReceivedRequests = catchAsync(
  async (req: Request, res: Response) => {
    const email = getUserEmail(req);

    const result =
      await PurchaseRequestService.getReceivedRequests(email);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Received purchase requests retrieved successfully",
      data: result,
    });
  }
);

const getSingleRequest = catchAsync(
  async (req: Request, res: Response) => {
    const email = getUserEmail(req);

    const requestId = String(req.params.requestId);

    const result =
      await PurchaseRequestService.getSingleRequest(
        requestId,
        email
      );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Purchase request retrieved successfully",
      data: result,
    });
  }
);

const updateRequestStatus = catchAsync(
  async (req: Request, res: Response) => {
    const email = getUserEmail(req);

    const requestId = String(req.params.requestId);

    const result =
      await PurchaseRequestService.updateRequestStatus(
        requestId,
        req.body.status as TPurchaseRequestStatus,
        email
      );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Purchase request status updated successfully",
      data: result,
    });
  }
);

export const PurchaseRequestController = {
  createPurchaseRequest,
  getSentRequests,
  getReceivedRequests,
  getSingleRequest,
  updateRequestStatus,
};