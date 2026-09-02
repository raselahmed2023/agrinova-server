import { Router } from "express";
import authenticate from "../../../middleware/authenticate";
import authorize from "../../../middleware/authorize";
import validateRequest from "../../../middleware/validateRequest";
import { ConsultationControllers } from "./consultation.controller";
import { ConsultationValidations } from "./consultation.validation";

const router = Router();

// Create new consultation request (farmer/admin)
router.post(
  "/",
  authenticate,
  validateRequest(ConsultationValidations.createConsultationValidationSchema),
  ConsultationControllers.createConsultation
);

// Get consultations list for current user
router.get("/", authenticate, ConsultationControllers.getAllConsultations);

// Expert stats
router.get(
  "/expert/stats",
  authenticate,
  authorize("EXPERT", "ADMIN"),
  ConsultationControllers.getExpertStats
);

// Expert view of consultation requests
router.get(
  "/expert",
  authenticate,
  authorize("EXPERT", "ADMIN"),
  ConsultationControllers.getExpertConsultations
);

// Get single consultation
router.get(
  "/:consultationId",
  authenticate,
  ConsultationControllers.getSingleConsultation
);

// Accept consultation request (Pending -> Accepted)
router.patch(
  "/:consultationId/accept",
  authenticate,
  authorize("EXPERT", "ADMIN"),
  ConsultationControllers.acceptConsultation
);

// Reject consultation request (Pending -> Rejected)
router.patch(
  "/:consultationId/reject",
  authenticate,
  authorize("EXPERT", "ADMIN"),
  validateRequest(ConsultationValidations.rejectConsultationValidationSchema),
  ConsultationControllers.rejectConsultation
);

// Schedule consultation
router.patch(
  "/:consultationId/schedule",
  authenticate,
  authorize("EXPERT", "ADMIN"),
  validateRequest(ConsultationValidations.scheduleConsultationValidationSchema),
  ConsultationControllers.scheduleConsultation
);

// Start video consultation (SCHEDULED -> ONGOING with Jitsi room ID)
router.patch(
  "/:consultationId/start",
  authenticate,
  authorize("EXPERT", "ADMIN"),
  ConsultationControllers.startConsultation
);

// Update general status
router.patch(
  "/:consultationId/status",
  authenticate,
  validateRequest(ConsultationValidations.updateStatusValidationSchema),
  ConsultationControllers.updateConsultationStatus
);

// Add prescription & recommendation
router.post(
  "/:consultationId/recommendation",
  authenticate,
  authorize("EXPERT", "ADMIN"),
  validateRequest(ConsultationValidations.createRecommendationValidationSchema),
  ConsultationControllers.addRecommendation
);

export const ConsultationRoutes = router;
