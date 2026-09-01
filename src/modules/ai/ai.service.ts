import type {
  IAITextResponse,
  IDiseaseDetectionResult,
  IFarmingAssistantInput,
  ISmartFarmingRecommendationInput,
  ISmartFarmingRecommendationResponse,
} from "./ai.interface.js";

import { Farm } from "../../app/modules/farm/farm.model.js";

import {
  generateAssistantWithGroq,
  generateRecommendationWithGroq,
} from "./providers/groq.provider.js";

import { detectDiseaseWithGemini } from "./providers/gemini.provider.js";

import {
  generateAssistantWithOpenRouter,
  generateRecommendationWithOpenRouter,
} from "./providers/openrouter.provider.js";

/* ---------------------------------
   Clean JSON Response
---------------------------------- */
const cleanJsonResponse = (text: string) => {
  return text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
};

/* ---------------------------------
   Farming Assistant Fallback
   Groq Key 2 -> OpenRouter Key 2
---------------------------------- */
const generateAssistantWithFallback = async (
  systemPrompt: string,
  userPrompt: string
): Promise<IAITextResponse> => {
  try {
    const answer =
      await generateAssistantWithGroq(
        systemPrompt,
        userPrompt
      );

    console.log(
      "Farming Assistant provider: GROQ"
    );

    return {
      answer,
      provider: "GROQ",
    };
  } catch (groqError) {
    console.error(
      "Assistant Groq failed:",
      groqError
    );

    console.log(
      "Switching Farming Assistant to OpenRouter..."
    );

    try {
      const answer =
        await generateAssistantWithOpenRouter(
          systemPrompt,
          userPrompt
        );

      console.log(
        "Farming Assistant provider: OPENROUTER"
      );

      return {
        answer,
        provider: "OPENROUTER",
      };
    } catch (openRouterError) {
      console.error(
        "Assistant OpenRouter failed:",
        openRouterError
      );

      throw new Error(
        "AI assistant is temporarily unavailable. Please try again shortly."
      );
    }
  }
};

/* ---------------------------------
   Smart Recommendation Fallback
   Groq Key 1 -> OpenRouter Key 1
---------------------------------- */
const generateRecommendationWithFallback = async (
  systemPrompt: string,
  userPrompt: string
): Promise<IAITextResponse> => {
  try {
    console.log(
      "Trying Smart Recommendation with GROQ..."
    );

    const answer =
      await generateRecommendationWithGroq(
        systemPrompt,
        userPrompt
      );

    console.log(
      "Smart Recommendation provider: GROQ"
    );

    return {
      answer,
      provider: "GROQ",
    };
  } catch (groqError) {
    console.error(
      "Recommendation Groq failed:",
      groqError
    );

    console.log(
      "Switching Smart Recommendation to OpenRouter..."
    );

    try {
      const answer =
        await generateRecommendationWithOpenRouter(
          systemPrompt,
          userPrompt
        );

      console.log(
        "Smart Recommendation provider: OPENROUTER"
      );

      return {
        answer,
        provider: "OPENROUTER",
      };
    } catch (openRouterError) {
      console.error(
        "Recommendation OpenRouter failed:",
        openRouterError
      );

      throw new Error(
        "AI recommendation is temporarily unavailable. Please try again shortly."
      );
    }
  }
};

/* ---------------------------------
   Farming Assistant
---------------------------------- */
const farmingAssistant = async (
  payload: IFarmingAssistantInput
): Promise<IAITextResponse> => {
  const systemPrompt = `
You are AgriNova Farming Assistant.

AgriNova is a smart agriculture platform primarily designed for farmers in Bangladesh.

You provide practical guidance about:

- crop cultivation
- orchard and horticulture
- poultry farming
- livestock farming
- fish farming
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
5. If information is insufficient, ask for missing details.
6. Do not provide unsafe pesticide, medicine, antibiotic, or chemical dosage instructions.
7. For serious disease, animal health, chemical, or safety issues, recommend consulting a qualified expert.
`;

  const userPrompt = `
Farmer question:

${payload.message}

Additional farm context:

${payload.context || "No additional farm context provided."}
`;

  return generateAssistantWithFallback(
    systemPrompt,
    userPrompt
  );
};

/* ---------------------------------
   Smart Farming Recommendation
---------------------------------- */
const smartFarmingRecommendation = async (
  payload: ISmartFarmingRecommendationInput
): Promise<ISmartFarmingRecommendationResponse> => {
  console.log(
    "Smart recommendation request:",
    {
      farmId: payload.farmId,
      hasProblem:
        Boolean(payload.problem?.trim()),
    }
  );

  const farm = await Farm.findById(
    payload.farmId
  ).lean();

  if (!farm) {
    console.error(
      "Smart recommendation farm not found:",
      payload.farmId
    );

    throw new Error("Farm not found");
  }

  if (farm.status !== "Active") {
    console.error(
      "Smart recommendation inactive farm:",
      farm._id
    );

    throw new Error(
      "Please select an active farm"
    );
  }

  console.log(
    "Farm loaded for recommendation:",
    {
      id: farm._id,
      name: farm.name,
      farmType: farm.farmType,
      status: farm.status,
    }
  );

  const location = [
    farm.upazila,
    farm.district,
    farm.division,
  ]
    .filter(Boolean)
    .join(", ");

  const isCropBased =
    farm.farmType === "Crop" ||
    farm.farmType === "Orchard";

  const isFishery =
    farm.farmType === "Fishery";

  const areaInfo =
    isCropBased || isFishery
      ? `${farm.landArea ?? "Not provided"} ${
          farm.unit ?? ""
        }`.trim()
      : "Not applicable";

  const soilInfo =
    isCropBased
      ? farm.soilType || "Not provided"
      : "Not applicable";

  const systemPrompt = `
You are AgriNova Smart Farming Recommendation Assistant.

AgriNova supports farmers in Bangladesh across:

- crop farming
- orchard and horticulture
- poultry farming
- livestock farming
- fish farming

Your task is to analyze the farmer's registered farm information and the farming problem they describe, then provide practical and easy-to-understand recommendations.

Rules:

1. Focus specifically on the farmer's problem.
2. Use the registered farm information when relevant.
3. Consider the farm type before giving advice.
4. Use location when it may affect the recommendation.
5. Use land area and soil type only when relevant.
6. Do not force crop-related advice on poultry, livestock, or fish farms.
7. Keep the answer practical and farmer-friendly.
8. Consider Bangladesh's farming conditions when relevant.
9. Do not invent exact yield, income, or profit guarantees.
10. Do not provide unsafe pesticide, veterinary medicine, antibiotic, or chemical dosage instructions.
11. For serious crop disease, animal health, fish health, or chemical issues, recommend consulting a qualified expert.
12. If there is not enough information, clearly mention what additional information would help.
13. Do not return JSON.
14. Do not use markdown tables.
15. Keep the recommendation concise and useful.

Use this response structure:

Problem Assessment:
Briefly explain what the problem may indicate.

Recommended Actions:
Give practical steps the farmer can take.

Things to Watch:
Mention important warning signs or risks.

When to Seek Expert Help:
Include this only when expert help is relevant.
`;

  const userPrompt = `
Registered Farm Information:

Farm Name:
${farm.name}

Farm Type:
${farm.farmType || "Not provided"}

Location:
${location || "Not provided"}

Area:
${areaInfo}

Soil Type:
${soilInfo}

Farmer's Problem:

${payload.problem}
`;

  const response =
    await generateRecommendationWithFallback(
      systemPrompt,
      userPrompt
    );

  console.log(
    "Smart recommendation generated successfully:",
    {
      provider: response.provider,
      farmId: farm._id,
    }
  );

  return {
    recommendation:
      response.answer.trim(),

    provider:
      response.provider,
  };
};

/* ---------------------------------
   Disease Detection
---------------------------------- */
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
  } catch (error) {
    console.error(
      "Disease detection JSON parse failed:",
      error
    );

    throw new Error(
      "AI returned an invalid disease analysis response"
    );
  }
};

export const AIService = {
  farmingAssistant,
  smartFarmingRecommendation,
  diseaseDetection,
};