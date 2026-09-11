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
      sellerId: user.id,
      sellerName: user.name || "Farmer",
      sellerEmail: user.email,
      isFeatured: false,
      status: "pending",
    };

    const result = await ProductService.createProductInDB(
      payload
    );

    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: "Product submitted for admin approval",
      data: result,
    });
  }
);

const getProducts = catchAsync(
  async (req: Request, res: Response) => {
    const result = await ProductService.getProductsFromDB(
      req.query
    );

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
    const productId = String(req.params.productId);

    const result = await ProductService.getProductByIdFromDB(
      productId
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
      {
        id: user.id,
        email: user.email,
      }
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

const getMyProductById = catchAsync(
  async (req: Request, res: Response) => {
    const user = requireUser(req);
    const productId = String(req.params.productId);

    const result = await ProductService.getMyProductByIdFromDB(
      productId,
      {
        id: user.id,
        email: user.email,
      }
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Listing fetched successfully",
      data: result,
    });
  }
);

const updateProduct = catchAsync(
  async (req: Request, res: Response) => {
    const user = requireUser(req);
    const productId = String(req.params.productId);

    const result = await ProductService.updateProductInDB(
      productId,
      {
        id: user.id,
        email: user.email,
      },
      req.body
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message:
        result.status === "pending"
          ? "Product updated and submitted for admin review"
          : "Product updated successfully",
      data: result,
    });
  }
);

const deleteProduct = catchAsync(
  async (req: Request, res: Response) => {
    const user = requireUser(req);
    const productId = String(req.params.productId);

    const result = await ProductService.deleteProductFromDB(
      productId,
      {
        id: user.id,
        email: user.email,
      }
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
  getMyProductById,
  updateProduct,
  deleteProduct,
};