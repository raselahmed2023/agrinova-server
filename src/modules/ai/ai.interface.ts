export interface IFarmingAssistantInput {
  message: string;
  farmId?: string;
  context?: string;
}

export interface ISmartFarmingRecommendationInput {
  farmId: string;
  problem: string;
}

export interface ISmartFarmingRecommendationResponse {
  recommendation: string;
  provider: "GROQ" | "OPENROUTER";
}

export interface IDiseaseDetectionResult {
  cropName?: string;

  diseaseDetected: boolean;

  diseaseName: string;

  confidence: "Low" | "Medium" | "High";

  symptoms: string[];

  treatment: string[];

  prevention: string[];

  warning?: string;
}

export interface IAITextResponse {
  answer: string;
  provider: "GROQ" | "OPENROUTER";
}