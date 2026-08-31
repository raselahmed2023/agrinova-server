import { Router } from "express";

import authenticate from "../../middleware/authenticate";
import authorize from "../../middleware/authorize";
import validateRequest from "../../middleware/validateRequest";
import { ProductController } from "./product.controller";
import { ProductValidation } from "./product.validation";

const router = Router();

// Public marketplace browse
router.get(
  "/products",
  validateRequest(ProductValidation.getProductsQueryValidationSchema),
  ProductController.getProducts
);

// Protected seller routes
router.post(
  "/products",
  authenticate,
  authorize("FARMER"),
  validateRequest(ProductValidation.createProductValidationSchema),
  ProductController.createProduct
);

router.get(
  "/my-listings",
  authenticate,
  authorize("FARMER"),
  validateRequest(ProductValidation.getMyListingsQueryValidationSchema),
  ProductController.getMyListings
);

router.get(
  "/products/my-listings",
  authenticate,
  authorize("FARMER"),
  validateRequest(ProductValidation.getMyListingsQueryValidationSchema),
  ProductController.getMyListings
);

// Keep this after /products/my-listings
router.get(
  "/products/:productId",
  ProductController.getSingleProduct
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

export const ProductRoutes = router;
