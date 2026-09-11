import { Request, Response } from "express";

import httpStatus from "http-status";
import AppError from "../../../utils/AppError";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { AdminService } from "../admin.service";

const getReason = (req: Request) =>
  typeof req.body?.reason === "string" ? req.body.reason.trim() : "";

export const ProductController = {
  getAdminProducts: catchAsync(async (req: Request, res: Response) => {
    const result = await AdminService.getAdminProductsFromDB(req.query);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Marketplace products retrieved successfully",
      meta: result.meta,
      data: result.data,
    });
  }),

  getAdminProductById: catchAsync(async (req: Request, res: Response) => {
    const product = await AdminService.getAdminProductByIdFromDB(
      String(req.params.productId)
    );

    if (!product) {
      throw new AppError(httpStatus.NOT_FOUND, "Product not found");
    }

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Product details retrieved successfully",
      data: product,
    });
  }),

  moderateProduct: catchAsync(async (req: Request, res: Response) => {
    const product = await AdminService.moderateProductInDB(
      String(req.params.productId),
      getReason(req),
      req.user?.email
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Product hidden and farmer notified",
      data: product,
    });
  }),

  restoreProduct: catchAsync(async (req: Request, res: Response) => {
    const product = await AdminService.restoreProductInDB(
      String(req.params.productId),
      req.user?.email
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Product restored and farmer notified",
      data: product,
    });
  }),

  removeProduct: catchAsync(async (req: Request, res: Response) => {
    const product = await AdminService.removeProductInDB(
      String(req.params.productId),
      getReason(req),
      req.user?.email
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Product removed and farmer notified",
      data: product,
    });
  }),

  /** Legacy endpoints retained so older builds do not hard-fail. */
  approveProduct: catchAsync(async (req: Request, res: Response) => {
    const product = await AdminService.restoreProductInDB(
      String(req.params.productId),
      req.user?.email
    );
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Product restored successfully",
      data: product,
    });
  }),

  rejectProduct: catchAsync(async (req: Request, res: Response) => {
    const product = await AdminService.moderateProductInDB(
      String(req.params.productId),
      getReason(req) || "Listing hidden by AgriNova moderation.",
      req.user?.email
    );
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Product hidden and farmer notified",
      data: product,
    });
  }),

  disableProduct: catchAsync(async (req: Request, res: Response) => {
    const product = await AdminService.moderateProductInDB(
      String(req.params.productId),
      getReason(req) || "Listing hidden by AgriNova moderation.",
      req.user?.email
    );
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Product hidden and farmer notified",
      data: product,
    });
  }),
};