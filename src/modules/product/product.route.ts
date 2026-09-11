import { Router } from "express";

import authenticate from "../../middleware/authenticate";
import authorize from "../../middleware/authorize";
import validateRequest from "../../middleware/validateRequest";

import { ProductController } from "./product.controller";
import { ProductValidation } from "./product.validation";

const router = Router();

/* PUBLIC */
router.get(
  "/products",
  validateRequest(
    ProductValidation.getProductsQueryValidationSchema
  ),
  ProductController.getProducts
);

/* FARMER / SELLER - static routes MUST be before /products/:productId */
router.get(
  "/my-listings",
  authenticate,
  authorize("FARMER"),
  validateRequest(
    ProductValidation.getMyListingsQueryValidationSchema
  ),
  ProductController.getMyListings
);

router.get(
  "/my-listings/:productId",
  authenticate,
  authorize("FARMER"),
  ProductController.getMyProductById
);

/* Backward-compatible URLs */
router.get(
  "/products/my-listings",
  authenticate,
  authorize("FARMER"),
  validateRequest(
    ProductValidation.getMyListingsQueryValidationSchema
  ),
  ProductController.getMyListings
);

router.get(
  "/products/my-listings/:productId",
  authenticate,
  authorize("FARMER"),
  ProductController.getMyProductById
);

router.post(
  "/products",
  authenticate,
  authorize("FARMER"),
  validateRequest(
    ProductValidation.createProductValidationSchema
  ),
  ProductController.createProduct
);

router.patch(
  "/products/:productId",
  authenticate,
  authorize("FARMER"),
  validateRequest(
    ProductValidation.updateProductValidationSchema
  ),
  ProductController.updateProduct
);

router.delete(
  "/products/:productId",
  authenticate,
  authorize("FARMER"),
  ProductController.deleteProduct
);

/* Public single-product route comes last so it cannot shadow static routes. */
router.get(
  "/products/:productId",
  ProductController.getSingleProduct
);

export const ProductRoutes = router;