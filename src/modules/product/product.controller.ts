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

const getSingleProduct = catchAsync(async (req: Request, res: Response) => {
  const { productId } = req.params;
  const result = await ProductService.getProductByIdFromDB(productId as string);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Product fetched successfully",
    data: result,
  });
});

const updateProduct = catchAsync(async (req: Request, res: Response) => {
  const { productId } = req.params;
  const result = await ProductService.updateProductInDB(
    productId as string,
    req.body
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Product updated successfully",
    data: result,
  });
});

const deleteProduct = catchAsync(async (req: Request, res: Response) => {
  const { productId } = req.params;
  const result = await ProductService.deleteProductFromDB(productId as string);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Product deleted successfully",
    data: result,
  });
});

const getMyListings = catchAsync(async (req: Request, res: Response) => {
  const userEmail =
    (req.headers["x-seller-email"] as string) ||
    (req.headers["seller-email"] as string) ||
    (req.headers["user-email"] as string);

  const result = await ProductService.getMyListingsFromDB(
    req.query,
    userEmail
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "My listings fetched successfully",
    meta: result.meta,
    data: result.data,
  });
});

export const ProductController = {
  createProduct,
  getProducts,
  getSingleProduct,
  updateProduct,
  deleteProduct,
  getMyListings,
};
