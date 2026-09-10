import {
  Router,
} from "express";

import authenticate from "../../middleware/authenticate";
import authorize from "../../middleware/authorize";
import validateRequest from "../../middleware/validateRequest";

import {
  ProductController,
} from "./product.controller";

import {
  ProductValidation,
} from "./product.validation";

const router =
  Router();

/**
 * PUBLIC MARKETPLACE
 */

/**
 * Browse products
 */
router.get(
  "/products",

  validateRequest(
    ProductValidation
      .getProductsQueryValidationSchema
  ),

  ProductController.getProducts
);

/**
 * Single product details
 *
 * Keep this after /products/my-listings
 * so "my-listings" is not treated as productId.
 */
router.get(
  "/products/:productId",

  ProductController.getSingleProduct
);

/**
 * FARMER / SELLER
 */

/**
 * Create listing
 */
router.post(
  "/products",

  authenticate,

  authorize("FARMER"),

  validateRequest(
    ProductValidation
      .createProductValidationSchema
  ),

  ProductController.createProduct
);

/**
 * Farmer's own listings
 */
router.get(
  "/my-listings",
  authenticate,
  authorize("FARMER"),
  validateRequest(
    ProductValidation
      .getMyListingsQueryValidationSchema
  ),

  ProductController.getMyListings
);

/**
 * Backward-compatible URL
 */
router.get(
  "/products/my-listings",
  authenticate,
  authorize("FARMER"),
  validateRequest(
    ProductValidation
      .getMyListingsQueryValidationSchema
  ),

  ProductController.getMyListings
);

/**
 * Update own listing
 */
router.patch(
  "/products/:productId",
  authenticate,
  authorize("FARMER"),
  validateRequest(
    ProductValidation
      .updateProductValidationSchema
  ),
  ProductController.updateProduct
);

/**
 * Delete own listing
 */
router.delete(
  "/products/:productId",
  authenticate,
  authorize("FARMER"),
  ProductController.deleteProduct
);

export const ProductRoutes =
  router;