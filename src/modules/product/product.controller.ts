import { Request, Response } from "express";

import AppError from "../../utils/AppError";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { ProductService } from "./product.service";

const requireUser = (req: Request) => {
  if (!req.user) {
    throw new AppError(401, "Authentication required");
  }

  return req.user;
};

const createProduct = catchAsync(
  async (req: Request, res: Response) => {
    const user = requireUser(req);

    const payload = {
      ...req.body,
      sellerName: user.name || "Farmer",
      sellerEmail: user.email,
      isFeatured: false,
    };

    const result = await ProductService.createProductInDB(payload);

    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: "Product created successfully",
      data: result,
    });
  }
);

const getProducts = catchAsync(
  async (req: Request, res: Response) => {
    const result = await ProductService.getProductsFromDB(req.query);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Products fetched successfully",
      meta: result.meta,
      data: result.data,
    });
  }
);

const getSingleProduct = catchAsync(
  async (req: Request, res: Response) => {
    const { productId } = req.params;

    const result = await ProductService.getProductByIdFromDB(
      productId as string
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Product fetched successfully",
      data: result,
    });
  }
);

const getMyListings = catchAsync(
  async (req: Request, res: Response) => {
    const user = requireUser(req);

    const result = await ProductService.getMyListingsFromDB(
      req.query,
      user.email
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "My listings fetched successfully",
      meta: result.meta,
      data: result.data,
    });
  }
);

const updateProduct = catchAsync(
  async (req: Request, res: Response) => {
    const user = requireUser(req);
    const { productId } = req.params;

    const result = await ProductService.updateProductInDB(
      productId as string,
      user.email,
      req.body
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Product updated successfully",
      data: result,
    });
  }
);

const deleteProduct = catchAsync(
  async (req: Request, res: Response) => {
    const user = requireUser(req);
    const { productId } = req.params;

    const result = await ProductService.deleteProductFromDB(
      productId as string,
      user.email
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Product deleted successfully",
      data: result,
    });
  }
);

export const ProductController = {
  createProduct,
  getProducts,
  getSingleProduct,
  getMyListings,
  updateProduct,
  deleteProduct,
};
