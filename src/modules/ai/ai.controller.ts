import type {
  Request,
  Response,
} from "express";

import { AIService } from "./ai.service.js";

export const detectDisease = async (
  req: Request,
  res: Response
) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message:
          "Crop image is required",
      });
    }

    const cropName =
      typeof req.body?.cropName ===
      "string"
        ? req.body.cropName.trim()
        : undefined;

    const result =
      await AIService.diseaseDetection(
        req.file.buffer,
        req.file.mimetype,
        cropName
      );

    return res.status(200).json({
      success: true,
      message:
        "Disease analysis completed successfully",
      data: result,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Disease detection failed";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};

export const getFarmingAssistantResponse =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const {
        message,
        context,
      } = req.body;

      const result =
        await AIService.farmingAssistant({
          message,
          context,
        });

      return res.status(200).json({
        success: true,
        message:
          "Farming assistant response generated successfully",
        data: result,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "AI request failed";

      return res.status(500).json({
        success: false,
        message,
      });
    }
  };

export const getSmartFarmingRecommendation =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const {
        farmId,
        problem,
      } = req.body;

      if (!farmId) {
        return res.status(400).json({
          success: false,
          message:
            "Farm ID is required",
        });
      }

      if (
        !problem ||
        !problem.trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Farming problem is required",
        });
      }

      const result =
        await AIService.smartFarmingRecommendation(
          {
            farmId,
            problem:
              problem.trim(),
          }
        );

      return res.status(200).json({
        success: true,
        message:
          "Smart farming recommendation generated successfully",
        data: result,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Smart farming recommendation failed";

      return res.status(500).json({
        success: false,
        message,
      });
    }
  };