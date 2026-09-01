export interface IAITextResponse {
  answer: string;
  provider: "GROQ" | "OPENROUTER";
}

export interface IFarmingAssistantInput {
  message: string;
  context?: string;
}

export interface ISmartFarmingInput {
  farmId: string;
  problem: string;
}

export interface ISmartFarmingResponse {
  recommendation: string;
  provider: "GROQ" | "OPENROUTER";
}

export interface IDiseaseDetectionResult {
  diseaseName?: string;
  confidence?: number;
  symptoms?: string[];
  possibleCauses?: string[];
  recommendations?: string[];
  prevention?: string[];
  warning?: string;
}