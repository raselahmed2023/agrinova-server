import { Request, Response } from "express";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { ProductService } from "./product.service";

const createProduct = catchAsync(async (req: Request, res: Response) => {
  const result = await ProductService.createProductInDB(req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Product created successfully",
    data: result,
  });
});

const getProducts = catchAsync(async (req: Request, res: Response) => {
  const result = await ProductService.getProductsFromDB(req.query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Products fetched successfully",
    meta: result.meta,
    data: result.data,
  });
});

export const ProductController = {
  createProduct,
  getProducts,
};
