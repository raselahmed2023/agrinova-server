import type { Request, Response } from "express";

import AppError from "../../utils/AppError";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";

import type { TPurchaseRequestStatus } from "./purchaseRequest.interface";
import { PurchaseRequestService } from "./purchaseRequest.service";

const requireUser = (req: Request) => {
  if (!req.user) {
    throw new AppError(401, "Authentication required");
  }

  return req.user;
};

const createPurchaseRequest = catchAsync(
  async (req: Request, res: Response) => {
    const user = requireUser(req);

    const result =
      await PurchaseRequestService.createPurchaseRequest(
        req.body,
        {
          id: user.id,
          name: user.name,
          email: user.email,
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
    const user = requireUser(req);

    const result =
      await PurchaseRequestService.getSentRequests(
        user.email
      );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message:
        "Sent purchase requests retrieved successfully",
      data: result,
    });
  }
);

const getReceivedRequests = catchAsync(
  async (req: Request, res: Response) => {
    const user = requireUser(req);

    const result =
      await PurchaseRequestService.getReceivedRequests(
        user.email
      );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message:
        "Received purchase requests retrieved successfully",
      data: result,
    });
  }
);

const getSingleRequest = catchAsync(
  async (req: Request, res: Response) => {
    const user = requireUser(req);

    const requestId = String(
      req.params.requestId
    );

    const result =
      await PurchaseRequestService.getSingleRequest(
        requestId,
        user.email
      );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message:
        "Purchase request retrieved successfully",
      data: result,
    });
  }
);

const updateRequestStatus = catchAsync(
  async (req: Request, res: Response) => {
    const user = requireUser(req);

    const requestId = String(
      req.params.requestId
    );

    const result =
      await PurchaseRequestService.updateRequestStatus(
        requestId,
        req.body.status as TPurchaseRequestStatus,
        user.email
      );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message:
        "Purchase request status updated successfully",
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
