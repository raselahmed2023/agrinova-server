import { GoogleGenAI } from "@google/genai";

const GEMINI_DISEASE_MODEL =
  process.env.GEMINI_DISEASE_MODEL ||
  process.env.GEMINI_MODEL ||
  "gemini-3.6-flash";

const GEMINI_TREATMENT_MODEL =
  process.env.GEMINI_TREATMENT_MODEL ||
  process.env.GEMINI_MODEL ||
  "gemini-3.6-flash";

const getGeminiApiKeys = (): string[] => {
  const keys = [
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
  ].filter(
    (key): key is string =>
      Boolean(key && key.trim())
  );

  if (keys.length === 0) {
    throw new Error(
      "AI service is not configured properly."
    );
  }

  return keys;
};

const createGeminiClient = (
  apiKey: string
) => {
  return new GoogleGenAI({
    apiKey,
  });
};

const isRetryableGeminiError = (
  error: unknown
): boolean => {
  const err = error as {
    status?: number;
    message?: string;
  };

  const status = err?.status;

  const message =
    err?.message?.toLowerCase() || "";

  return (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    message.includes("429") ||
    message.includes("500") ||
    message.includes("502") ||
    message.includes("503") ||
    message.includes("504") ||
    message.includes("quota") ||
    message.includes("rate limit") ||
    message.includes("unavailable") ||
    message.includes("high demand") ||
    message.includes("overloaded") ||
    message.includes("temporarily unavailable") ||
    message.includes("timeout")
  );
};

const cleanJsonText = (
  text: string
): string => {
  return text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
};

const buildDiseasePrompt = (
  cropName?: string
) => `
You are AgriNova's crop disease analysis assistant.

Analyze the uploaded crop or leaf image carefully.

Crop:
${cropName || "Unknown"}

Return ONLY valid JSON using exactly this structure:

{
  "cropName": "string",
  "diseaseDetected": true,
  "diseaseName": "string",
  "confidence": "Low | Medium | High",
  "symptoms": ["string"],
  "treatment": ["string"],
  "prevention": ["string"],
  "warning": "string"
}

Rules:

1. Do not return markdown.
2. Do not use code fences.
3. Never claim absolute certainty from an image.
4. If no clear disease is visible, set diseaseDetected to false.
5. If the image quality is poor, mention it in warning.
6. Give practical agricultural advice.
7. Avoid recommending unsafe pesticide quantities.
8. If professional diagnosis is advisable, mention consulting an agricultural expert.
9. Keep the response concise and useful.
`;

const callGeminiDiseaseModel = async (
  apiKey: string,
  imageBuffer: Buffer,
  mimeType: string,
  cropName?: string
): Promise<string> => {
  const ai = createGeminiClient(apiKey);

  const response =
    await ai.models.generateContent({
      model: GEMINI_DISEASE_MODEL,

      contents: [
        {
          inlineData: {
            mimeType,
            data: imageBuffer.toString(
              "base64"
            ),
          },
        },
        {
          text: buildDiseasePrompt(
            cropName
          ),
        },
      ],
    });

  const text = response?.text;

  if (!text || !text.trim()) {
    throw new Error(
      "AI analysis could not generate a result."
    );
  }

  return cleanJsonText(text);
};

export const detectDiseaseWithGemini =
  async (
    imageBuffer: Buffer,
    mimeType: string,
    cropName?: string
  ): Promise<string> => {
    const keys = getGeminiApiKeys();

    let lastError: unknown;

    for (
      let index = 0;
      index < keys.length;
      index++
    ) {
      const apiKey = keys[index];

      try {
        return await callGeminiDiseaseModel(
          apiKey,
          imageBuffer,
          mimeType,
          cropName
        );
      } catch (error) {
        lastError = error;

        console.error(
          `Gemini disease detection attempt ${
            index + 1
          } failed:`,
          error
        );

        const isLastKey =
          index === keys.length - 1;

        if (
          !isRetryableGeminiError(error) ||
          isLastKey
        ) {
          break;
        }
      }
    }

    console.error(
      "Disease detection failed after Gemini fallback:",
      lastError
    );

    throw new Error(
      "AI analysis is temporarily unavailable. Please try again shortly."
    );
  };

/* -------------------------------------------------------------------------- */
/*                         Treatment Recommendation                            */
/* -------------------------------------------------------------------------- */

interface TreatmentRecommendationInput {
  cropType: string;
  problemTitle: string;
  problemDescription: string;
  urgency?: string;
  treatmentMode?: string;
  farmDetails?: string;
}

const buildTreatmentPrompt = (
  input: TreatmentRecommendationInput
): string => {
  const modeInstruction =
    input.treatmentMode === "organic"
      ? `
Focus on organic, biological, and eco-friendly
cultural methods such as sanitation, biological
control, botanical methods, and approved
bio-pesticides.
`
      : input.treatmentMode === "chemical"
      ? `
Focus on appropriate conventional treatment
options using approved active ingredients.
Do not provide unsafe or unverified chemical
dosages.
`
      : `
Use an Integrated Pest and Disease Management
(IPM) approach combining sanitation, cultural
practices, biological control, monitoring, and
appropriate approved treatment options.
`;

  return `
You are AgriNova's agricultural treatment
recommendation assistant.

Analyze the farmer's reported crop problem.

Crop:
${input.cropType}

Problem:
${input.problemTitle}

Symptoms and Details:
${input.problemDescription}

Urgency:
${input.urgency || "NORMAL"}

Treatment Mode:
${input.treatmentMode || "integrated"}

${
  input.farmDetails
    ? `Farm Details:
${input.farmDetails}`
    : ""
}

Strategy:
${modeInstruction}

Give practical agricultural guidance suitable
for Bangladesh when relevant.

Return ONLY valid JSON using exactly this structure:

{
  "diagnosis": "string",
  "prescriptions": ["string"],
  "treatmentSteps": ["string"],
  "followUpDays": 7,
  "followUpDate": "YYYY-MM-DD",
  "additionalNotes": "string"
}

Rules:

1. Return ONLY valid JSON.
2. Do not return markdown.
3. Do not use code fences.
4. Do not claim absolute certainty.
5. Do not invent missing farm information.
6. Provide 2 to 4 practical prescription or
   management recommendations.
7. Provide 3 to 5 sequential treatment steps.
8. followUpDays must be an integer between 5 and 21.
9. Avoid unsafe pesticide or chemical dosage
   instructions.
10. If professional diagnosis is necessary,
    recommend consulting a qualified agricultural
    expert.
11. Mention relevant safety precautions.
`;
};

const callGeminiTreatmentModel = async (
  apiKey: string,
  input: TreatmentRecommendationInput
): Promise<string> => {
  const ai = createGeminiClient(apiKey);

  const response =
    await ai.models.generateContent({
      model: GEMINI_TREATMENT_MODEL,

      contents: [
        {
          text: buildTreatmentPrompt(input),
        },
      ],
    });

  const text = response?.text;

  if (!text || !text.trim()) {
    throw new Error(
      "Gemini returned an empty treatment recommendation."
    );
  }

  return cleanJsonText(text);
};

export const generateTreatmentRecommendationWithGemini =
  async (
    input: TreatmentRecommendationInput
  ): Promise<string> => {
    const keys = getGeminiApiKeys();

    let lastError: unknown;

    for (
      let index = 0;
      index < keys.length;
      index++
    ) {
      const apiKey = keys[index];

      try {
        return await callGeminiTreatmentModel(
          apiKey,
          input
        );
      } catch (error) {
        lastError = error;

        console.error(
          `Gemini treatment recommendation attempt ${
            index + 1
          } failed:`,
          error
        );

        const isLastKey =
          index === keys.length - 1;

        if (
          !isRetryableGeminiError(error) ||
          isLastKey
        ) {
          break;
        }
      }
    }

    console.error(
      "Treatment recommendation failed after Gemini fallback:",
      lastError
    );

    throw new Error(
      "AI treatment recommendation is temporarily unavailable. Please try again shortly."
    );
  };