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

export interface ITreatmentRecommendationInput {
  cropType: string;
  problemTitle: string;
  problemDescription: string;
  urgency?: string;
  treatmentMode?: "integrated" | "organic" | "chemical";
  farmDetails?: string;
}

export interface ITreatmentRecommendationResult {
  diagnosis: string;
  prescriptions: string[];
  treatmentSteps: string[];
  followUpDays: number;
  followUpDate: string;
  additionalNotes: string;
  treatmentMode: string;
}