import { UserController } from "./controllers/user.controller";
import { ExpertController } from "./controllers/expert.controller";
import { FarmController } from "./controllers/farm.controller";
import { ProductController } from "./controllers/product.controller";
import { ConsultationController } from "./controllers/consultation.controller";
import { AnalyticsController } from "./controllers/analytics.controller";

export const AdminController = {
  ...UserController,
  ...ExpertController,
  ...FarmController,
  ...ProductController,
  ...ConsultationController,
  ...AnalyticsController,
};