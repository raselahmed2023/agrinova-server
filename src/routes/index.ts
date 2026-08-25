import { Router } from "express";
import { ProductRoutes } from "../modules/product/product.route";

const router = Router();

const moduleRoutes = [
  {
    path: "/marketplace",
    route: ProductRoutes,
  },
];

router.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "AgriNova API health check successful",
  });
});

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;