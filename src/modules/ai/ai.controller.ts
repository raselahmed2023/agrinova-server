import type {
  Request,
  Response,
} from "express";

import { AIService } from "./ai.service.js";

const farmingAssistant = async (
  req: Request,
  res: Response
) => {
  try {
    const result =
      await AIService.farmingAssistant(req.body);

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

const cropRecommendation = async (
  req: Request,
  res: Response
) => {
  try {
    const result =
      await AIService.cropRecommendation(req.body);

    return res.status(200).json({
      success: true,
      message:
        "Crop recommendations generated successfully",
      data: result,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Crop recommendation failed";

    return res.status(500).json({
      success: false,
      message,
    });
  }
};

const diseaseDetection = async (
  req: Request,
  res: Response
) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Crop image is required",
      });
    }

    const result =
      await AIService.diseaseDetection(
        req.file.buffer,
        req.file.mimetype,
        req.body.cropName
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

export const AIController = {
  farmingAssistant,
  cropRecommendation,
  diseaseDetection,
};