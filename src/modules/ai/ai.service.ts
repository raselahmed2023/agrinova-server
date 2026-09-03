import type {
  IAITextResponse,
  IDiseaseDetectionResult,
  IFarmingAssistantInput,
} from "./ai.interface.js";

import { Farm } from "../../app/modules/farm/farm.model.js";

import { generateWithGroq } from "./providers/groq.provider.js";
import { generateWithOpenRouter } from "./providers/openrouter.provider.js";
import { detectDiseaseWithGemini } from "./providers/gemini.provider.js";

interface SmartFarmingInput {
  farmId: string;
  problem: string;
}

interface SmartFarmingResponse {
  recommendation: string;
  provider: "GROQ" | "OPENROUTER";
}

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

    const answer =
      await generateWithOpenRouter(
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
  if (
    !payload.message ||
    !payload.message.trim()
  ) {
    throw new Error(
      "Message is required"
    );
  }

  const systemPrompt = `
You are AgriNova Farming Assistant.

AgriNova is a smart agriculture platform for farmers in Bangladesh.

Help farmers with:
- crop cultivation
- orchard management
- poultry
- livestock
- fish farming
- soil management
- irrigation
- fertilizer guidance
- pests and diseases
- weather-related farming decisions
- harvesting
- general farm management

Rules:
1. Give practical and simple advice.
2. Consider Bangladesh farming conditions when relevant.
3. Do not invent information.
4. If important information is missing, clearly mention it.
5. Do not guarantee yield, profit or disease diagnosis.
6. Avoid unsafe pesticide or chemical dosage instructions.
7. Recommend an agricultural expert for serious disease or chemical issues.
8. Keep the answer focused on the farmer's actual question.
`;

  const userPrompt = `
Farmer question:
${payload.message.trim()}

Additional context:
${payload.context || "No additional context provided."}
`;

  return generateTextWithFallback(
    systemPrompt,
    userPrompt
  );
};

const smartFarmingRecommendation =
  async (
    payload: SmartFarmingInput
  ): Promise<SmartFarmingResponse> => {
    if (!payload.farmId) {
      throw new Error(
        "Farm ID is required"
      );
    }

    if (
      !payload.problem ||
      !payload.problem.trim()
    ) {
      throw new Error(
        "Farming problem is required"
      );
    }

    const farm = await Farm.findById(
      payload.farmId
    ).lean();

    if (!farm) {
      throw new Error(
        "Farm not found"
      );
    }

    if (
      farm.status !== "Active"
    ) {
      throw new Error(
        "Only active farms can use smart farming recommendation"
      );
    }

    const location = [
      (farm as any).upazila,
      farm.district,
      farm.division,
    ]
      .filter(Boolean)
      .join(", ");

    const farmType =
      (farm as any).farmType ||
      "Farm";

    const systemPrompt = `
You are AgriNova Smart Farming Recommendation Assistant.

Your job is to analyze a farmer's real farm information and the farming problem they describe.

The platform supports:
- Crop farms
- Orchards / horticulture
- Poultry farms
- Livestock farms
- Fish farms

Give practical recommendations suitable for Bangladesh when relevant.

Rules:
1. Use the provided farm information.
2. Address the farmer's exact problem.
3. Give clear actionable steps.
4. Mention important risks or warning signs when relevant.
5. Do not invent unavailable farm data.
6. Do not guarantee yield, profit or recovery.
7. Do not provide unsafe pesticide, veterinary medicine or chemical dosage instructions.
8. Recommend consulting a qualified agricultural expert or veterinarian when the problem requires professional diagnosis.
9. Keep the answer concise but useful.
10. Do not return JSON or markdown code blocks.
`;

    const userPrompt = `
Farm Name:
${farm.name}

Farm Type:
${farmType}

Location:
${location || "Not provided"}

Land / Pond Area:
${farm.landArea ?? "Not provided"} ${farm.unit ?? ""}

Soil Type:
${farm.soilType || "Not provided"}

Farm Description:
${farm.description || "Not provided"}

Farmer's Problem:
${payload.problem.trim()}

Provide a practical smart farming recommendation for this farm.
`;

    const response =
      await generateTextWithFallback(
        systemPrompt,
        userPrompt
      );

    return {
      recommendation:
        response.answer,
      provider:
        response.provider,
    };
  };

const diseaseDetection = async (
  imageBuffer: Buffer,
  mimeType: string,
  cropName?: string
): Promise<IDiseaseDetectionResult> => {
  const response =
    await detectDiseaseWithGemini(
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

export const AIService = {
  farmingAssistant,
  smartFarmingRecommendation,
  diseaseDetection,
};