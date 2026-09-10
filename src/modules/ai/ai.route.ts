import { Router } from "express";
import multer from "multer";

import {
  cropRecommendationSchema,
  farmingAssistantSchema,
  treatmentRecommendationSchema,
} from "./ai.validation.js";

import {
  cropRecommendation,
  getFarmingAssistantResponse,
  getSmartFarmingRecommendation,
  detectDisease,
  treatmentRecommendation,
} from "./ai.controller.js";

import { validateRequest } from "../../middleware/validateRequest.js";

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
  getSmartFarmingRecommendation
);

router.post(
  "/crop-recommendation",
  validateRequest(cropRecommendationSchema),
  cropRecommendation
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