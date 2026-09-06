import {
  Request,
  Response,
} from "express";

import httpStatus from "http-status";

import AppError from "../../../utils/AppError";

import catchAsync from "../../../utils/catchAsync";

import sendResponse from "../../../utils/sendResponse";

import {
  AdminService,
} from "../admin.service";

export const ProductController =
  {
    getAdminProducts:
      catchAsync(
        async (
          req: Request,
          res: Response
        ) => {
          const result =
            await AdminService.getAdminProductsFromDB(
              req.query
            );

          sendResponse(
            res,
            {
              statusCode:
                200,

              success:
                true,

              message:
                "Products retrieved successfully",

              meta:
                result.meta,

              data:
                result.data,
            }
          );
        }
      ),

    getAdminProductById:
      catchAsync(
        async (
          req: Request,
          res: Response
        ) => {
          const productId =
            String(
              req.params
                .productId
            );

          const product =
            await AdminService.getAdminProductByIdFromDB(
              productId
            );

          if (
            !product
          ) {
            throw new AppError(
              httpStatus.NOT_FOUND,
              "Product not found"
            );
          }

          sendResponse(
            res,
            {
              statusCode:
                200,

              success:
                true,

              message:
                "Product details retrieved successfully",

              data:
                product,
            }
          );
        }
      ),

    disableProduct:
      catchAsync(
        async (
          req: Request,
          res: Response
        ) => {
          const productId =
            String(
              req.params
                .productId
            );

          const updatedProduct =
            await AdminService.disableProductInDB(
              productId
            );

          if (
            !updatedProduct
          ) {
            throw new AppError(
              404,
              "Product not found"
            );
          }

          sendResponse(
            res,
            {
              statusCode:
                200,

              success:
                true,

              message:
                "Product disabled successfully",

              data:
                updatedProduct,
            }
          );
        }
      ),

    restoreProduct:
      catchAsync(
        async (
          req: Request,
          res: Response
        ) => {
          const productId =
            String(
              req.params
                .productId
            );

          const updatedProduct =
            await AdminService.restoreProductInDB(
              productId
            );

          if (
            !updatedProduct
          ) {
            throw new AppError(
              404,
              "Product not found"
            );
          }

          sendResponse(
            res,
            {
              statusCode:
                200,

              success:
                true,

              message:
                "Product restored successfully",

              data:
                updatedProduct,
            }
          );
        }
      ),

    removeProduct:
      catchAsync(
        async (
          req: Request,
          res: Response
        ) => {
          const productId =
            String(
              req.params
                .productId
            );

          const updatedProduct =
            await AdminService.removeProductInDB(
              productId
            );

          if (
            !updatedProduct
          ) {
            throw new AppError(
              404,
              "Product not found"
            );
          }

          sendResponse(
            res,
            {
              statusCode:
                200,

              success:
                true,

              message:
                "Product removed successfully",

              data:
                updatedProduct,
            }
          );
        }
      ),
  };