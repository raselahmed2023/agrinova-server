import { GoogleGenAI } from "@google/genai";

const GEMINI_DISEASE_MODEL =
  process.env.GEMINI_DISEASE_MODEL ||
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
  const ai =
    createGeminiClient(apiKey);

  const response =
    await ai.models.generateContent({
      model:
        GEMINI_DISEASE_MODEL,

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

  if (
    !text ||
    !text.trim()
  ) {
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
    const keys =
      getGeminiApiKeys();

    let lastError: unknown;

    for (
      let index = 0;
      index < keys.length;
      index++
    ) {
      const apiKey =
        keys[index];

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
          index ===
          keys.length - 1;

        if (
          !isRetryableGeminiError(
            error
          ) ||
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