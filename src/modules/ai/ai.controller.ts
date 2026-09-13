import type { Request, Response } from "express";
import { AIService } from "./ai.service.js";

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export const agentEgg = async (req: Request, res: Response) => {
  try {
    const result = await AIService.agentEgg({
      message: req.body.message,
      context: req.body.context,
    });
    return res.status(200).json({
      success: true,
      message: "Agent Egg response generated successfully",
      data: result,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: errorMessage(error, "Agent Egg request failed") });
  }
};

export const detectDisease = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: "Authentication required" });
    if (!req.file) return res.status(400).json({ success: false, message: "Crop image is required" });

    const cropName = typeof req.body?.cropName === "string" ? req.body.cropName.trim() : undefined;
    const result = await AIService.diseaseDetection(req.file.buffer, req.file.mimetype, cropName);
    return res.status(200).json({ success: true, message: "Disease analysis completed successfully", data: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: errorMessage(error, "Disease detection failed") });
  }
};

export const getFarmingAssistantResponse = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: "Authentication required" });

    const result = await AIService.farmingAssistant(
      {
        message: req.body.message,
        context: req.body.context,
        farmId: req.body.farmId,
      },
      req.user.id
    );

    return res.status(200).json({ success: true, message: "Farming assistant response generated successfully", data: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: errorMessage(error, "AI request failed") });
  }
};

export const getSmartFarmingRecommendation = async (req: Request, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, message: "Authentication required" });

    const { farmId, problem } = req.body;
    const result = await AIService.smartFarmingRecommendation(
      { farmId, problem: problem.trim() },
      req.user.id
    );

    return res.status(200).json({ success: true, message: "Smart farming recommendation generated successfully", data: result });
  } catch (error) {
    const message = errorMessage(error, "Smart farming recommendation failed");
    const status = message.includes("not found") || message.includes("do not own") ? 404 : 500;
    return res.status(status).json({ success: false, message });
  }
};

export const treatmentRecommendation = async (req: Request, res: Response) => {
  try {
    const result = await AIService.treatmentRecommendation(req.body);
    return res.status(200).json({ success: true, message: "AI treatment recommendation formulated successfully", data: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: errorMessage(error, "AI treatment recommendation failed") });
  }
};

export const AIController = {
  agentEgg,
  farmingAssistant: getFarmingAssistantResponse,
  diseaseDetection: detectDisease,
  smartFarmingRecommendation: getSmartFarmingRecommendation,
  treatmentRecommendation,
};