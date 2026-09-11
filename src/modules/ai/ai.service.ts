import type {
  IAITextResponse,
  IDiseaseDetectionResult,
  IFarmingAssistantInput,
  ITreatmentRecommendationInput,
  ITreatmentRecommendationResult,
} from "./ai.interface.js";

import { Farm } from "../../app/modules/farm/farm.model.js";
import { generateWithGroq } from "./providers/groq.provider.js";
import { generateWithOpenRouter } from "./providers/openrouter.provider.js";
import {
  detectDiseaseWithGemini,
  generateTreatmentRecommendationWithGemini,
} from "./providers/gemini.provider.js";

interface SmartFarmingInput {
  farmId: string;
  problem: string;
}

interface SmartFarmingResponse {
  recommendation: string;
  provider: "GROQ" | "OPENROUTER";
}

const cleanJsonResponse = (text: string): string =>
  text.replace(/```json/gi, "").replace(/```/g, "").trim();

const generateTextWithFallback = async (
  systemPrompt: string,
  userPrompt: string
): Promise<IAITextResponse> => {
  try {
    const answer = await generateWithGroq(systemPrompt, userPrompt);
    return { answer, provider: "GROQ" };
  } catch (groqError) {
    console.error("Groq failed. Switching to OpenRouter:", groqError);
    const answer = await generateWithOpenRouter(systemPrompt, userPrompt);
    return { answer, provider: "OPENROUTER" };
  }
};

const agentEgg = async (payload: { message: string; context?: string }): Promise<IAITextResponse> => {
  if (!payload.message?.trim()) throw new Error("Message is required");

  const systemPrompt = `
You are Agent Egg, the friendly AI guide for AgriNova, a Bangladesh-focused digital agriculture platform.

You can explain:
- how AgriNova works
- farming basics and general crop, livestock, poultry and fish guidance
- the Marketplace for buying/selling approved farm products
- Investment Projects, where approved farmers can request funding and other farmers can invest after admin review
- AI crop disease detection and farming recommendations in the Farmer Dashboard
- expert consultation features
- weather and farm-management features

Navigation guidance you may mention:
- Marketplace: /marketplace
- Investment Projects: /investment
- Farmer Dashboard: /dashboard/farmer
- Expert directory: /consultant
- Login: /login
- Register: /register

Rules:
1. Be concise, warm and practical.
2. Never claim access to the visitor's account, farms, orders, investments, private documents or payment data.
3. If the user asks for account-specific information, tell them to sign in and use the relevant dashboard section.
4. Do not promise investment returns, crop yields or guaranteed disease diagnoses.
5. Do not provide unsafe pesticide, veterinary-drug or chemical dosing instructions.
6. For serious disease, finance, investment, legal or payment disputes, recommend human verification.
7. Do not invent AgriNova features that are not listed above.
8. Answer in Bangla when the user writes Bangla; otherwise match the user's language.
`;

  const userPrompt = `Visitor question:\n${payload.message.trim()}\n\nOptional page context:\n${payload.context || "AgriNova website"}`;
  return generateTextWithFallback(systemPrompt, userPrompt);
};

const farmingAssistant = async (
  payload: IFarmingAssistantInput,
  farmerId: string
): Promise<IAITextResponse> => {
  if (!payload.message?.trim()) throw new Error("Message is required");

  let farmContext = "No farm selected.";

  if (payload.farmId) {
    const farm = await Farm.findOne({
      _id: payload.farmId,
      farmerId,
    }).lean();

    if (!farm) {
      throw new Error("Farm not found or you do not own this farm");
    }

    farmContext = [
      `Farm: ${farm.name}`,
      `Type: ${farm.farmType}`,
      `Location: ${[farm.upazila, farm.district, farm.division].filter(Boolean).join(", ")}`,
      `Area: ${farm.landArea ?? "Not provided"} ${farm.unit ?? ""}`,
      `Soil: ${farm.soilType || "Not provided"}`,
      `Description: ${farm.description || "Not provided"}`,
    ].join("\n");
  }

  const systemPrompt = `
You are AgriNova Farming Assistant for authenticated farmers in Bangladesh.
Help with crop cultivation, orchard management, poultry, livestock, fish farming, soil, irrigation, fertilizer guidance, pests and diseases, weather-related decisions, harvesting and farm management.

Rules:
1. Give practical and simple advice.
2. Use selected farm data when provided.
3. Consider Bangladesh conditions when relevant.
4. Do not invent unavailable farm data.
5. Do not guarantee yield, profit or disease diagnosis.
6. Avoid unsafe pesticide, veterinary medicine or chemical dosage instructions.
7. Recommend a qualified expert for serious disease, chemical or veterinary issues.
8. Keep the answer focused on the farmer's actual question.
`;

  const userPrompt = `
Farmer question:
${payload.message.trim()}

Selected farm context:
${farmContext}

Additional context:
${payload.context || "No additional context provided."}
`;

  return generateTextWithFallback(systemPrompt, userPrompt);
};

const smartFarmingRecommendation = async (
  payload: SmartFarmingInput,
  farmerId: string
): Promise<SmartFarmingResponse> => {
  if (!payload.farmId) throw new Error("Farm ID is required");
  if (!payload.problem?.trim()) throw new Error("Farming problem is required");

  const farm = await Farm.findOne({
    _id: payload.farmId,
    farmerId,
  }).lean();

  if (!farm) throw new Error("Farm not found or you do not own this farm");
  if (farm.status !== "Active") throw new Error("Only active farms can use smart farming recommendation");

  const location = [farm.upazila, farm.district, farm.division].filter(Boolean).join(", ");
  const farmType = farm.farmType || "Farm";

  const systemPrompt = `
You are AgriNova Smart Farming Recommendation Assistant.
Analyze the authenticated farmer's own farm information and the farming problem they describe.
The platform supports crop, orchard/horticulture, poultry, livestock and fish farms.
Give practical recommendations suitable for Bangladesh when relevant.

Rules:
1. Use the provided farm information.
2. Address the exact problem.
3. Give clear actionable steps.
4. Mention important risks or warning signs.
5. Do not invent unavailable farm data.
6. Do not guarantee yield, profit or recovery.
7. Do not provide unsafe pesticide, veterinary medicine or chemical dosage instructions.
8. Recommend a qualified agricultural expert or veterinarian when professional diagnosis is required.
9. Keep the answer concise but useful.
10. Do not return JSON or markdown code blocks.
`;

  const userPrompt = `
Farm Name: ${farm.name}
Farm Type: ${farmType}
Location: ${location || "Not provided"}
Land / Pond Area: ${farm.landArea ?? "Not provided"} ${farm.unit ?? ""}
Soil Type: ${farm.soilType || "Not provided"}
Farm Description: ${farm.description || "Not provided"}
Farmer's Problem: ${payload.problem.trim()}

Provide a practical smart farming recommendation for this farm.
`;

  const response = await generateTextWithFallback(systemPrompt, userPrompt);
  return { recommendation: response.answer, provider: response.provider };
};

const diseaseDetection = async (
  imageBuffer: Buffer,
  mimeType: string,
  cropName?: string
): Promise<IDiseaseDetectionResult> => {
  const response = await detectDiseaseWithGemini(imageBuffer, mimeType, cropName);
  try {
    return JSON.parse(cleanJsonResponse(response)) as IDiseaseDetectionResult;
  } catch {
    throw new Error("Gemini returned an invalid disease detection response");
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
      typeof parsed.followUpDays === "number" && !Number.isNaN(parsed.followUpDays)
        ? parsed.followUpDays
        : 7;
    const futureDate = new Date(today.getTime() + followUpDays * 24 * 60 * 60 * 1000);
    const followUpDate = parsed.followUpDate || futureDate.toISOString().split("T")[0];

    return {
      diagnosis:
        parsed.diagnosis ||
        `Clinical agronomic diagnosis for ${payload.cropType} (${payload.problemTitle}). Follow prescribed management plan.`,
      prescriptions: Array.isArray(parsed.prescriptions)
        ? parsed.prescriptions.map((item: unknown) => String(item).trim()).filter(Boolean)
        : [],
      treatmentSteps: Array.isArray(parsed.treatmentSteps)
        ? parsed.treatmentSteps.map((item: unknown) => String(item).trim()).filter(Boolean)
        : [],
      followUpDays,
      followUpDate,
      additionalNotes:
        parsed.additionalNotes ||
        "Wear appropriate protective equipment and follow product labels and local agricultural guidance.",
      treatmentMode: payload.treatmentMode || "integrated",
    };
  } catch {
    throw new Error("Gemini returned an invalid treatment recommendation response");
  }
};

export const AIService = {
  agentEgg,
  farmingAssistant,
  smartFarmingRecommendation,
  diseaseDetection,
  treatmentRecommendation,
};