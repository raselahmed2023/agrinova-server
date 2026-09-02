import { Router } from "express";

import { FarmRoutes } from "../app/modules/farm/farm.route";
import { WeatherRoutes } from "../app/modules/weather/weather.route";
import aiRouter from "../modules/ai/ai.route.js";
import { ProductRoutes } from "../modules/product/product.route";
import financeRouter from "../modules/finance/finance.route.js";
import { PurchaseRequestRoutes } from "../modules/purchase-request/purchaseRequest.route";
import { AdminRoutes } from "../modules/admin/admin.route"; // AdminRoute import kora holo

const router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message:
      "AgriNova API health check successful",
  });
});

const moduleRoutes = [
  {
    path: "/farms",
    route: FarmRoutes,
  },

  {
    path: "/weather",
    route: WeatherRoutes,
  },

  {
    path: "/ai",
    route: aiRouter,
  },

  {
    path: "/marketplace",
    route: ProductRoutes,
  },

  {
    path: "/purchase-requests",
    route: PurchaseRequestRoutes,
  },

  {
    path: "/finance",
    route: financeRouter,
  },

  {
    path: "/admin", 
    route: AdminRoutes,
  },
];

moduleRoutes.forEach((route) => {
  router.use(
    route.path,
    route.route
  );
});

export default router;