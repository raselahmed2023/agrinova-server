import { Router } from "express";
import multer from "multer";

import { validateRequest } from "../../middleware/validateRequest.js";
import { AIController } from "./ai.controller.js";
import {
  cropRecommendationSchema,
  farmingAssistantSchema,
} from "./ai.validation.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 5 * 1024 * 1024,
  },

  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      cb(
        new Error(
          "Only JPG, PNG and WEBP images are allowed"
        )
      );

      return;
    }

    cb(null, true);
  },
});

router.post(
  "/assistant",
  validateRequest(farmingAssistantSchema),
  AIController.farmingAssistant
);

router.post(
  "/crop-recommendation",
  validateRequest(cropRecommendationSchema),
  AIController.cropRecommendation
);

router.post(
  "/disease-detection",
  upload.single("image"),
  AIController.diseaseDetection
);

export default router;