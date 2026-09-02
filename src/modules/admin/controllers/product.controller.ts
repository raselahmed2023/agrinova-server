import { Request, Response } from "express";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { AdminService } from "../admin.service";
import AppError from "../../../utils/AppError";
import httpStatus from "http-status";

export const ProductController = {
  getAdminProducts: catchAsync(async (req: Request, res: Response) => {
    const result = await AdminService.getAdminProductsFromDB(req.query);
    sendResponse(res, { statusCode: 200, success: true, message: "Products retrieved successfully", meta: result.meta, data: result.data });
  }),

  getAdminProductById: catchAsync(async (req: Request, res: Response) => {
    const { productId } = req.params;
    const product = await AdminService.getAdminProductByIdFromDB(productId as string);
    if (!product) throw new AppError(httpStatus.NOT_FOUND, "Product not found");
    sendResponse(res, { statusCode: 200, success: true, message: "Product details retrieved successfully", data: product });
  }),

  disableProduct: catchAsync(async (req: Request, res: Response) => {
    const { productId } = req.params;
    const updatedProduct = await AdminService.updateProductStatusInDB(productId as string, "DISABLED");
    sendResponse(res, { statusCode: 200, success: true, message: "Product disabled successfully", data: updatedProduct });
  }),

  restoreProduct: catchAsync(async (req: Request, res: Response) => {
    const { productId } = req.params;
    const updatedProduct = await AdminService.updateProductStatusInDB(productId as string, "ACTIVE");
    sendResponse(res, { statusCode: 200, success: true, message: "Product restored successfully", data: updatedProduct });
  }),

  removeProduct: catchAsync(async (req: Request, res: Response) => {
    const { productId } = req.params;
    const updatedProduct = await AdminService.updateProductStatusInDB(productId as string, "REMOVED");
    sendResponse(res, { statusCode: 200, success: true, message: "Product removed successfully", data: updatedProduct });
  })
};