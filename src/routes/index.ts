import { FarmRoutes } from '../app/modules/farm/farm.route';
import { WeatherRoutes } from '../app/modules/weather/weather.route';
import { Router } from "express";

const router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "AgriNova API health check successful",
  });
});



const moduleRoutes = [
  {
    path: '/farms',
    route: FarmRoutes,
  },
  {
    path: '/weather',
    route: WeatherRoutes,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;