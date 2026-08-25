import { GoogleGenAI } from "@google/genai";

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not configured"
    );
  }

  return new GoogleGenAI({
    apiKey,
  });
};

export const detectDiseaseWithGemini = async (
  imageBuffer: Buffer,
  mimeType: string,
  cropName?: string
): Promise<string> => {
  const ai = getGeminiClient();

  const prompt = `
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
`;

  const response = await ai.models.generateContent({
    model: "gemini-3.7-flash",

    contents: [
      {
        inlineData: {
          mimeType,
          data: imageBuffer.toString("base64"),
        },
      },
      {
        text: prompt,
      },
    ],
  });

  if (!response.text) {
    throw new Error(
      "Gemini returned an empty response"
    );
  }

  return response.text;
};