import { Router } from "express";
import validateRequest from "../../middleware/validateRequest";
import { ProductController } from "./product.controller";
import { ProductValidation } from "./product.validation";

const router = Router();

router.post(
  "/",
  validateRequest(ProductValidation.createProductValidationSchema),
  ProductController.createProduct
);

router.get(
  "/",
  validateRequest(ProductValidation.getProductsQueryValidationSchema),
  ProductController.getProducts
);

router.get("/:productId", ProductController.getSingleProduct);

export const ProductRoutes = router;
