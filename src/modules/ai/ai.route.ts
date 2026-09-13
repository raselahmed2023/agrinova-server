import { Router } from "express";
import multer from "multer";

import authenticate from "../../middleware/authenticate";
import authorize from "../../middleware/authorize";
import validateRequest from "../../middleware/validateRequest";

import {
  agentEggSchema,
  farmingAssistantSchema,
  smartFarmingRecommendationSchema,
  treatmentRecommendationSchema,
} from "./ai.validation.js";
import {
  agentEgg,
  detectDisease,
  getFarmingAssistantResponse,
  getSmartFarmingRecommendation,
  treatmentRecommendation,
} from "./ai.controller.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Public website assistant. It never receives private farm/account data.
router.post("/agent-egg", validateRequest(agentEggSchema), agentEgg);

// Farmer-only AI tools.
router.post(
  "/assistant",
  authenticate,
  authorize("FARMER"),
  validateRequest(farmingAssistantSchema),
  getFarmingAssistantResponse
);
router.post(
  "/smart-farming-recommendation",
  authenticate,
  authorize("FARMER"),
  validateRequest(smartFarmingRecommendationSchema),
  getSmartFarmingRecommendation
);
router.post(
  "/disease-detection",
  authenticate,
  authorize("FARMER"),
  upload.single("image"),
  detectDisease
);

// This feature is used from the expert consultation workflow.
router.post(
  "/treatment-recommendation",
  authenticate,
  authorize("EXPERT"),
  validateRequest(treatmentRecommendationSchema),
  treatmentRecommendation
);

export default router;