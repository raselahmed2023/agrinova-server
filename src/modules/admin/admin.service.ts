import { UserService } from "./services/user.service";
import { ExpertService } from "./services/expert.service";
import { FarmService } from "./services/farm.service";
import { ProductService } from "./services/product.service";
import { ConsultationService } from "./services/consultation.service";
import { AnalyticsService } from "./services/analytics.service";

export const AdminService = {
  ...UserService,
  ...ExpertService,
  ...FarmService,
  ...ProductService,
  ...ConsultationService,
  ...AnalyticsService,
};