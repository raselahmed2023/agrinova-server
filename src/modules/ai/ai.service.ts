import type {
  IAITextResponse,
  IDiseaseDetectionResult,
  IFarmingAssistantInput,
  ITreatmentRecommendationInput,
  ITreatmentRecommendationResult,
} from "./ai.interface.js";

import {
  Farm,
} from "../../app/modules/farm/farm.model.js";

import {
  generateWithGroq,
} from "./providers/groq.provider.js";

import {
  generateWithOpenRouter,
} from "./providers/openrouter.provider.js";

import {
  detectDiseaseWithGemini,
} from "./providers/gemini.provider.js";

interface SmartFarmingInput {
  farmId: string;
  problem: string;
}

interface SmartFarmingResponse {
  recommendation: string;

  provider:
    | "GROQ"
    | "OPENROUTER";
}

type AIKeyGroup =
  | "chat"
  | "agentEgg"
  | "other";

const cleanJsonResponse = (
  text: string
): string =>
  text
    .replace(
      /```json/gi,
      ""
    )
    .replace(
      /```/g,
      ""
    )
    .trim();

const generateTextWithFallback =
  async (
    systemPrompt: string,
    userPrompt: string,
    keyGroup: AIKeyGroup
  ): Promise<IAITextResponse> => {
    try {
      const answer =
        await generateWithGroq(
          systemPrompt,
          userPrompt,
          keyGroup
        );

      return {
        answer,
        provider: "GROQ",
      };
    } catch (groqError) {
      console.error(
        `${keyGroup} Groq failed. Switching to matching OpenRouter fallback:`,
        groqError
      );

      const answer =
        await generateWithOpenRouter(
          systemPrompt,
          userPrompt,
          keyGroup
        );

      return {
        answer,
        provider:
          "OPENROUTER",
      };
    }
  };

/* ============================================================
   AGENT EGG
   GROQ 3 -> OPENROUTER 3
============================================================ */

const agentEgg = async (
  payload: {
    message: string;
    context?: string;
  }
): Promise<IAITextResponse> => {
  if (
    !payload.message?.trim()
  ) {
    throw new Error(
      "Message is required"
    );
  }

  const systemPrompt = `
You are Agent Egg, the friendly AI guide for AgriNova, a Bangladesh-focused digital agriculture platform.

You can explain:

- how AgriNova works
- general farming guidance
- crop farming
- livestock farming
- poultry farming
- fish farming
- AgriNova Marketplace
- AgriNova Investment Projects
- Farmer Dashboard features
- AI farming tools
- crop disease detection
- agricultural expert consultation
- Community
- Blogs
- Weather
- farm management

AgriNova Marketplace:
- Farmers can publish eligible marketplace products directly.
- Marketplace products do not require routine admin approval before publication.
- Admin may moderate, hide or remove listings that violate AgriNova rules.

Investment:
- Farmers can submit eligible funding projects.
- Investment projects require administrative review before becoming publicly investable.
- Another farmer may apply to invest in an approved project.
- A farmer cannot invest in their own investment project.
- Investment applications may require administrative verification before payment.

Navigation:

Marketplace:
/marketplace

Investment:
/investment

Community:
/community

Farmer Dashboard:
/dashboard/farmer

Experts:
/consultant

Login:
/login

Register:
/register

Rules:

1. Be concise, friendly and practical.

2. Never claim access to private account data.

3. Never claim access to:
- private farms
- private orders
- payment information
- NID information
- private investment applications
- private documents

4. If account-specific information is requested, tell the user to sign in and use the appropriate dashboard.

5. Never guarantee:
- crop yield
- investment return
- profit
- disease diagnosis
- treatment success

6. Do not provide unsafe pesticide, chemical, antibiotic or veterinary drug dosing instructions.

7. For serious agricultural disease, veterinary issues, investment disputes, legal matters or payment disputes, recommend qualified human review.

8. Do not invent AgriNova features.

9. If the visitor writes in Bangla, answer in Bangla.

10. Otherwise use the visitor's language.
`;

  const userPrompt = `
Visitor question:

${payload.message.trim()}

Page context:

${
  payload.context ||
  "AgriNova website"
}
`;

  return generateTextWithFallback(
    systemPrompt,
    userPrompt,
    "agentEgg"
  );
};

/* ============================================================
   FARMER CHAT
   GROQ 1 -> GROQ 2 -> OPENROUTER 1 -> OPENROUTER 2
============================================================ */

const farmingAssistant =
  async (
    payload:
      IFarmingAssistantInput,

    farmerId: string
  ): Promise<IAITextResponse> => {
    if (
      !payload.message?.trim()
    ) {
      throw new Error(
        "Message is required"
      );
    }

    let farmContext =
      "No farm selected.";

    if (payload.farmId) {
      const farm =
        await Farm.findOne({
          _id: payload.farmId,

          farmerId,
        }).lean();

      if (!farm) {
        throw new Error(
          "Farm not found or you do not own this farm"
        );
      }

      farmContext = [
        `Farm: ${farm.name}`,

        `Type: ${
          farm.farmType
        }`,

        `Location: ${[
          farm.upazila,
          farm.district,
          farm.division,
        ]
          .filter(Boolean)
          .join(", ")}`,

        `Area: ${
          farm.landArea ??
          "Not provided"
        } ${
          farm.unit ?? ""
        }`,

        `Soil: ${
          farm.soilType ||
          "Not provided"
        }`,

        `Description: ${
          farm.description ||
          "Not provided"
        }`,
      ].join("\n");
    }

    const systemPrompt = `
You are AgriNova Farming Assistant for authenticated farmers in Bangladesh.

Help farmers with:

- crop cultivation
- orchard management
- poultry
- livestock
- fish farming
- soil management
- irrigation
- fertilizer guidance
- pest management
- disease awareness
- weather-related farm decisions
- harvesting
- farm management

Rules:

1. Give practical and simple advice.

2. Use the selected farm information when provided.

3. Consider Bangladesh agricultural conditions when relevant.

4. Do not invent unavailable farm information.

5. Do not guarantee crop yield, profit or disease recovery.

6. Do not provide unsafe pesticide, chemical, antibiotic or veterinary medication dosages.

7. Recommend a qualified agricultural expert or veterinarian when professional diagnosis is required.

8. Keep answers focused on the farmer's question.
`;

    const userPrompt = `
Farmer question:

${payload.message.trim()}

Selected farm information:

${farmContext}

Additional context:

${
  payload.context ||
  "No additional context provided."
}
`;

    return generateTextWithFallback(
      systemPrompt,
      userPrompt,
      "chat"
    );
  };

/* ============================================================
   SMART FARMING
   GROQ 4 -> OPENROUTER 4
============================================================ */

const smartFarmingRecommendation =
  async (
    payload:
      SmartFarmingInput,

    farmerId: string
  ): Promise<SmartFarmingResponse> => {
    if (!payload.farmId) {
      throw new Error(
        "Farm ID is required"
      );
    }

    if (
      !payload.problem?.trim()
    ) {
      throw new Error(
        "Farming problem is required"
      );
    }

    const farm =
      await Farm.findOne({
        _id: payload.farmId,

        farmerId,
      }).lean();

    if (!farm) {
      throw new Error(
        "Farm not found or you do not own this farm"
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
      farm.upazila,
      farm.district,
      farm.division,
    ]
      .filter(Boolean)
      .join(", ");

    const farmType =
      farm.farmType ||
      "Farm";

    const systemPrompt = `
You are AgriNova Smart Farming Recommendation Assistant.

Analyze the authenticated farmer's own farm information and the farming problem.

The platform supports:

- crop farms
- orchard / horticulture farms
- poultry farms
- livestock farms
- fish farms

Give practical recommendations suitable for Bangladesh when relevant.

Rules:

1. Use the supplied farm information.

2. Address the exact problem.

3. Give clear actionable steps.

4. Mention important warning signs and risks.

5. Do not invent missing farm data.

6. Do not guarantee yield, profit or recovery.

7. Do not provide unsafe pesticide, chemical, antibiotic or veterinary drug dosages.

8. Recommend an agricultural expert or veterinarian when professional diagnosis is required.

9. Keep the response useful and reasonably concise.

10. Do not return JSON or markdown code blocks.
`;

    const userPrompt = `
Farm Name:
${farm.name}

Farm Type:
${farmType}

Location:
${
  location ||
  "Not provided"
}

Land / Pond Area:
${
  farm.landArea ??
  "Not provided"
} ${
  farm.unit ?? ""
}

Soil Type:
${
  farm.soilType ||
  "Not provided"
}

Farm Description:
${
  farm.description ||
  "Not provided"
}

Farmer's Problem:
${payload.problem.trim()}

Provide practical smart farming recommendations.
`;

    const response =
      await generateTextWithFallback(
        systemPrompt,
        userPrompt,
        "other"
      );

    return {
      recommendation:
        response.answer,

      provider:
        response.provider,
    };
  };

/* ============================================================
   IMAGE DISEASE DETECTION
   GEMINI ONLY
============================================================ */

const diseaseDetection =
  async (
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
        cleanJsonResponse(
          response
        )
      ) as IDiseaseDetectionResult;
    } catch {
      throw new Error(
        "Gemini returned an invalid disease detection response"
      );
    }
  };

/* ============================================================
   TREATMENT / OTHER AI
   GROQ 4 -> OPENROUTER 4
============================================================ */

const treatmentRecommendation =
  async (
    payload:
      ITreatmentRecommendationInput
  ): Promise<ITreatmentRecommendationResult> => {
    const systemPrompt = `
You are AgriNova's agricultural treatment recommendation assistant.

This is a non-image AI feature.

Return ONLY valid JSON with this exact structure:

{
  "diagnosis": "string",
  "prescriptions": ["string"],
  "treatmentSteps": ["string"],
  "followUpDays": 7,
  "followUpDate": "YYYY-MM-DD",
  "additionalNotes": "string"
}

Safety rules:

1. Return valid JSON only.

2. Do not return markdown.

3. Do not return code fences.

4. Do not claim certainty when information is insufficient.

5. Do not provide unsafe pesticide, chemical, antibiotic or veterinary drug dosages.

6. Prefer integrated and low-risk management.

7. Recommend a qualified agricultural expert or veterinarian when professional verification is needed.
`;

    const userPrompt = `
Crop / farm type:
${payload.cropType}

Problem:
${payload.problemTitle}

Description:
${payload.problemDescription}

Urgency:
${
  payload.urgency ||
  "Not specified"
}

Treatment mode:
${
  payload.treatmentMode ||
  "integrated"
}

Farm details:
${
  payload.farmDetails ||
  "Not provided"
}
`;

    const response =
      await generateTextWithFallback(
        systemPrompt,
        userPrompt,
        "other"
      );

    try {
      const parsed =
        JSON.parse(
          cleanJsonResponse(
            response.answer
          )
        );

      const today =
        new Date();

      const followUpDays =
        typeof parsed.followUpDays ===
          "number" &&
        !Number.isNaN(
          parsed.followUpDays
        )
          ? parsed.followUpDays
          : 7;

      const futureDate =
        new Date(
          today.getTime() +
            followUpDays *
              24 *
              60 *
              60 *
              1000
        );

      const followUpDate =
        parsed.followUpDate ||
        futureDate
          .toISOString()
          .split("T")[0];

      return {
        diagnosis:
          parsed.diagnosis ||
          `Agronomic assessment for ${payload.cropType} (${payload.problemTitle}).`,

        prescriptions:
          Array.isArray(
            parsed.prescriptions
          )
            ? parsed.prescriptions
                .map(
                  (
                    item:
                      unknown
                  ) =>
                    String(
                      item
                    ).trim()
                )
                .filter(Boolean)
            : [],

        treatmentSteps:
          Array.isArray(
            parsed.treatmentSteps
          )
            ? parsed.treatmentSteps
                .map(
                  (
                    item:
                      unknown
                  ) =>
                    String(
                      item
                    ).trim()
                )
                .filter(Boolean)
            : [],

        followUpDays,

        followUpDate,

        additionalNotes:
          parsed.additionalNotes ||
          "Follow product labels and local agricultural guidance, and seek expert verification for serious cases.",

        treatmentMode:
          payload.treatmentMode ||
          "integrated",
      };
    } catch {
      throw new Error(
        "AI returned an invalid treatment recommendation response"
      );
    }
  };

export const AIService = {
  agentEgg,
  farmingAssistant,
  smartFarmingRecommendation,
  diseaseDetection,
  treatmentRecommendation,
};