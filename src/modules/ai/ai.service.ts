import type {
  IAITextResponse,
  ICropRecommendationInput,
  ICropRecommendationResponse,
  IDiseaseDetectionResult,
  IFarmingAssistantInput,
  ITreatmentRecommendationInput,
  ITreatmentRecommendationResult,
} from "./ai.interface.js";

import { generateWithGroq } from "./providers/groq.provider.js";
import {
  detectDiseaseWithGemini,
  generateTreatmentRecommendationWithGemini,
} from "./providers/gemini.provider.js";
import { generateWithOpenRouter } from "./providers/openrouter.provider.js";

const cleanJsonResponse = (text: string) => {
  return text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
};

const generateTextWithFallback = async (
  systemPrompt: string,
  userPrompt: string
): Promise<IAITextResponse> => {
  try {
    const answer = await generateWithGroq(
      systemPrompt,
      userPrompt
    );

    return {
      answer,
      provider: "GROQ",
    };
  } catch (groqError) {
    console.error(
      "Groq failed. Switching to OpenRouter:",
      groqError
    );

    const answer = await generateWithOpenRouter(
      systemPrompt,
      userPrompt
    );

    return {
      answer,
      provider: "OPENROUTER",
    };
  }
};

const farmingAssistant = async (
  payload: IFarmingAssistantInput
): Promise<IAITextResponse> => {
  const systemPrompt = `
You are AgriNova Farming Assistant.

AgriNova is a smart agriculture platform primarily designed for farmers in Bangladesh.

You provide practical guidance about:

- crop cultivation
- soil management
- irrigation
- fertilizers
- pests and diseases
- weather-related farming decisions
- harvesting
- sustainable agriculture
- general farm management

Rules:

1. Give clear and farmer-friendly responses.
2. Focus on practical agricultural advice.
3. Consider Bangladesh's agricultural context when relevant.
4. Never invent information.
5. If information is insufficient, ask for the missing details.
6. Do not provide unsafe pesticide or chemical dosage instructions.
7. For serious crop disease or chemical issues, recommend consulting a qualified agricultural expert.
`;

  const userPrompt = `
Farmer question:

${payload.message}

Additional farm context:

${payload.context || "No additional farm context provided."}
`;

  return generateTextWithFallback(
    systemPrompt,
    userPrompt
  );
};

const cropRecommendation = async (
  payload: ICropRecommendationInput
): Promise<ICropRecommendationResponse> => {
  const systemPrompt = `
You are AgriNova's crop recommendation assistant.

Analyze the provided farm conditions and recommend suitable crops.

Return ONLY valid JSON.

Use exactly this structure:

{
  "recommendations": [
    {
      "cropName": "string",
      "suitability": "High",
      "reasons": [
        "string"
      ],
      "growingPeriod": "string",
      "basicCare": [
        "string"
      ],
      "risks": [
        "string"
      ]
    }
  ]
}

Rules:

1. Return 3 to 5 crop recommendations.
2. suitability must only be High, Medium, or Low.
3. Consider Bangladesh agricultural conditions when location is in Bangladesh.
4. Do not return markdown.
5. Do not use code fences.
6. Do not fabricate exact yield or profit guarantees.
`;

  const userPrompt = `
Farm Information

Location:
${payload.location}

Soil Type:
${payload.soilType}

Season:
${payload.season}

Water Availability:
${payload.waterAvailability}

Farm Size:
${payload.farmSize ?? "Not provided"}

Additional Notes:
${payload.notes ?? "None"}
`;

  const response = await generateTextWithFallback(
    systemPrompt,
    userPrompt
  );

  try {
    const parsed = JSON.parse(
      cleanJsonResponse(response.answer)
    );

    if (!Array.isArray(parsed.recommendations)) {
      throw new Error(
        "Recommendations array is missing"
      );
    }

    return {
      recommendations: parsed.recommendations,
      provider: response.provider,
    };
  } catch {
    throw new Error(
      "AI returned an invalid crop recommendation response"
    );
  }
};

const diseaseDetection = async (
  imageBuffer: Buffer,
  mimeType: string,
  cropName?: string
): Promise<IDiseaseDetectionResult> => {
  const response = await detectDiseaseWithGemini(
    imageBuffer,
    mimeType,
    cropName
  );

  try {
    return JSON.parse(
      cleanJsonResponse(response)
    ) as IDiseaseDetectionResult;
  } catch {
    throw new Error(
      "Gemini returned an invalid disease detection response"
    );
  }
};

const treatmentRecommendation = async (
  payload: ITreatmentRecommendationInput
): Promise<ITreatmentRecommendationResult> => {
  const response = await generateTreatmentRecommendationWithGemini(payload);

  try {
    const parsed = JSON.parse(cleanJsonResponse(response));

    const today = new Date();
    const followUpDays =
      typeof parsed.followUpDays === "number" && !isNaN(parsed.followUpDays)
        ? parsed.followUpDays
        : 7;
    const futureDate = new Date(
      today.getTime() + followUpDays * 24 * 60 * 60 * 1000
    );
    const followUpDateStr =
      parsed.followUpDate || futureDate.toISOString().split("T")[0];

    return {
      diagnosis:
        parsed.diagnosis ||
        `Clinical agronomic diagnosis for ${payload.cropType} (${payload.problemTitle}). Follow prescribed management plan.`,
      prescriptions: Array.isArray(parsed.prescriptions)
        ? parsed.prescriptions.map((p: any) => String(p).trim()).filter(Boolean)
        : [],
      treatmentSteps: Array.isArray(parsed.treatmentSteps)
        ? parsed.treatmentSteps.map((s: any) => String(s).trim()).filter(Boolean)
        : [],
      followUpDays,
      followUpDate: followUpDateStr,
      additionalNotes:
        parsed.additionalNotes ||
        "Wear protective gear during chemical or biological spray application. Observe recommended pre-harvest intervals.",
      treatmentMode: payload.treatmentMode || "integrated",
    };
  } catch {
    throw new Error(
      "Gemini returned an invalid treatment recommendation response"
    );
  }
};

export const AIService = {
  farmingAssistant,
  cropRecommendation,
  diseaseDetection,
  treatmentRecommendation,
};