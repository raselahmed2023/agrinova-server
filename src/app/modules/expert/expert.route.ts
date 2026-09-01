import { Router } from "express";
import authenticate from "../../../middleware/authenticate";
import authorize from "../../../middleware/authorize";
import validateRequest from "../../../middleware/validateRequest";
import { ExpertControllers } from "./expert.controller";
import { ExpertValidations } from "./expert.validation";

const router = Router();

// GET /api/v1/experts/me/dashboard
router.get(
  "/me/dashboard",
  authenticate,
  authorize("EXPERT", "ADMIN"),
  ExpertControllers.getExpertDashboard
);

// GET & PATCH /api/v1/experts/me/availability (User Specified)
router.get(
  "/me/availability",
  authenticate,
  authorize("EXPERT", "ADMIN"),
  ExpertControllers.getExpertAvailability
);

router.patch(
  "/me/availability",
  authenticate,
  authorize("EXPERT", "ADMIN"),
  validateRequest(ExpertValidations.updateAvailabilityValidationSchema),
  ExpertControllers.updateExpertAvailability
);

// Profile
router.get(
  "/profile",
  authenticate,
  authorize("EXPERT", "ADMIN"),
  ExpertControllers.getExpertProfile
);

router.put(
  "/profile",
  authenticate,
  authorize("EXPERT", "ADMIN"),
  validateRequest(ExpertValidations.updateExpertProfileValidationSchema),
  ExpertControllers.updateExpertProfile
);

// Availability Aliases
router.get(
  "/availability",
  authenticate,
  authorize("EXPERT", "ADMIN"),
  ExpertControllers.getExpertAvailability
);

router.put(
  "/availability",
  authenticate,
  authorize("EXPERT", "ADMIN"),
  validateRequest(ExpertValidations.updateAvailabilityValidationSchema),
  ExpertControllers.updateExpertAvailability
);

router.patch(
  "/availability",
  authenticate,
  authorize("EXPERT", "ADMIN"),
  validateRequest(ExpertValidations.updateAvailabilityValidationSchema),
  ExpertControllers.updateExpertAvailability
);

// Public / Farmer listing of specialists
router.get("/", ExpertControllers.getAllExperts);

export const ExpertRoutes = router;
