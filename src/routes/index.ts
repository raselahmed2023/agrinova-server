import { Router } from "express";

import { FarmRoutes } from "../app/modules/farm/farm.route";
import { WeatherRoutes } from "../app/modules/weather/weather.route";
import aiRouter from "../modules/ai/ai.route.js";
import { ProductRoutes } from "../modules/product/product.route";
import financeRouter from "../modules/finance/finance.route.js";
import investmentRouter from "../modules/investment/investment.route.js";
import notificationRouter from "../modules/notification/notification.route.js";
import { AdminRoutes } from "../modules/admin/admin.route";
import { ConsultationRoutes } from "../app/modules/consultation/consultation.route";
import { ExpertRoutes } from "../app/modules/expert/expert.route";
import { BlogRoutes } from "../app/modules/blog/blog.route";
import { SupplyChainRoutes } from "../modules/supply-chain/supplyRequest.route";
import { OrderRoutes } from "../modules/order/order.route";
import { PaymentRoutes } from "../modules/payment/payment.route";

const router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "AgriNova API health check successful",
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
    path: "/finance",
    route: financeRouter,
  },
  {
    path: "/consultations",
    route: ConsultationRoutes,
  },
  {
    path: "/experts",
    route: ExpertRoutes,
  },
  {
    path: "/investments",
    route: investmentRouter,
  },
  {
    path: "/notifications",
    route: notificationRouter,
  },
  {
    path: "/admin",
    route: AdminRoutes,
  },
  {
    path: "/blogs",
    route: BlogRoutes,
  },
  {
    path: "/supply-chain",
    route: SupplyChainRoutes,
  },
  {
    path: "/orders",
    route: OrderRoutes,
  },
  {
    path: "/payments",
    route: PaymentRoutes,
  },
];

moduleRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

export default router;