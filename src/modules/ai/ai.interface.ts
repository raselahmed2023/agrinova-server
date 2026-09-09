export interface IFarmingAssistantInput {
  message: string;
  farmId?: string;
  context?: string;
}

export interface ICropRecommendationInput {
  location: string;
  soilType: string;
  season: string;
  waterAvailability: "LOW" | "MEDIUM" | "HIGH";
  farmSize?: number;
  notes?: string;
}

export interface ICropRecommendation {
  cropName: string;
  suitability: "High" | "Medium" | "Low";
  reasons: string[];
  growingPeriod: string;
  basicCare: string[];
  risks: string[];
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

export interface ICropRecommendationResponse {
  recommendations: ICropRecommendation[];
  provider: "GROQ" | "OPENROUTER";
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