import { Router } from "express";
import multer from "multer";

import {
  detectDisease,
  getFarmingAssistantResponse,
  getSmartFarmingRecommendation,
} from "./ai.controller.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

router.post(
  "/disease-detection",
  upload.single("image"),
  detectDisease
);

router.post(
  "/smart-farming-recommendation",
  getSmartFarmingRecommendation
);

router.post(
  "/assistant",
  getFarmingAssistantResponse
);

export default router;