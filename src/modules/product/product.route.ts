import { Router } from "express";
import validateRequest from "../../middleware/validateRequest";
import { ProductController } from "./product.controller";
import { ProductValidation } from "./product.validation";

const router = Router();

// POST /api/v1/marketplace/products
router.post(
  "/products",
  validateRequest(ProductValidation.createProductValidationSchema),
  ProductController.createProduct
);

// GET /api/v1/marketplace/products
router.get(
  "/products",
  validateRequest(ProductValidation.getProductsQueryValidationSchema),
  ProductController.getProducts
);

// GET /api/v1/marketplace/my-listings
router.get(
  "/my-listings",
  validateRequest(ProductValidation.getMyListingsQueryValidationSchema),
  ProductController.getMyListings
);

// Support /products/my-listings as well
router.get(
  "/products/my-listings",
  validateRequest(ProductValidation.getMyListingsQueryValidationSchema),
  ProductController.getMyListings
);

// GET /api/v1/marketplace/products/:productId
router.get("/products/:productId", ProductController.getSingleProduct);

// PATCH /api/v1/marketplace/products/:productId
router.patch(
  "/products/:productId",
  validateRequest(ProductValidation.updateProductValidationSchema),
  ProductController.updateProduct
);

// DELETE /api/v1/marketplace/products/:productId
router.delete("/products/:productId", ProductController.deleteProduct);

export const ProductRoutes = router;
