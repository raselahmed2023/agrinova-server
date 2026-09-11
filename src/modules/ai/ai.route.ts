import { Router } from "express";
import multer from "multer";

import {
  farmingAssistantSchema,
  smartFarmingRecommendationSchema,
  treatmentRecommendationSchema,
} from "./ai.validation.js";

import {
  getFarmingAssistantResponse,
  getSmartFarmingRecommendation,
  detectDisease,
  treatmentRecommendation,
} from "./ai.controller.js";

import validateRequest from "../../middleware/validateRequest.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

router.post(
  "/assistant",
  validateRequest(farmingAssistantSchema),
  getFarmingAssistantResponse
);

router.post(
  "/smart-farming-recommendation",
  validateRequest(smartFarmingRecommendationSchema),
  getSmartFarmingRecommendation
);

router.post(
  "/treatment-recommendation",
  validateRequest(treatmentRecommendationSchema),
  treatmentRecommendation
);

router.post(
  "/disease-detection",
  upload.single("image"),
  detectDisease
);

export default router;