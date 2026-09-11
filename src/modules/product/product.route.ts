import { Router } from "express";

import authenticate from "../../middleware/authenticate";
import authorize from "../../middleware/authorize";
import validateRequest from "../../middleware/validateRequest";
import { ProductController } from "./product.controller";
import { ProductValidation } from "./product.validation";

const router = Router();

/** PUBLIC MARKETPLACE */
router.get(
  "/products",
  validateRequest(ProductValidation.getProductsQueryValidationSchema),
  ProductController.getProducts
);

/** FARMER / SELLER - keep static routes before /products/:productId */
router.get(
  "/my-listings",
  authenticate,
  authorize("FARMER"),
  validateRequest(ProductValidation.getMyListingsQueryValidationSchema),
  ProductController.getMyListings
);

router.get(
  "/my-listings/:productId",
  authenticate,
  authorize("FARMER"),
  ProductController.getMyListingById
);

/** Backward-compatible URLs */
router.get(
  "/products/my-listings",
  authenticate,
  authorize("FARMER"),
  validateRequest(ProductValidation.getMyListingsQueryValidationSchema),
  ProductController.getMyListings
);

router.get(
  "/products/my-listings/:productId",
  authenticate,
  authorize("FARMER"),
  ProductController.getMyListingById
);

router.post(
  "/products",
  authenticate,
  authorize("FARMER"),
  validateRequest(ProductValidation.createProductValidationSchema),
  ProductController.createProduct
);

router.patch(
  "/products/:productId",
  authenticate,
  authorize("FARMER"),
  validateRequest(ProductValidation.updateProductValidationSchema),
  ProductController.updateProduct
);

router.delete(
  "/products/:productId",
  authenticate,
  authorize("FARMER"),
  ProductController.deleteProduct
);

/** Public detail must be after the static seller routes above. */
router.get(
  "/products/:productId",
  ProductController.getSingleProduct
);

export const ProductRoutes = router;
