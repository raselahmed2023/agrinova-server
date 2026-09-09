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

export const generateTreatmentRecommendationWithGemini = async (input: {
  cropType: string;
  problemTitle: string;
  problemDescription: string;
  urgency?: string;
  treatmentMode?: string;
  farmDetails?: string;
}): Promise<string> => {
  const ai = getGeminiClient();

  const modeInstruction =
    input.treatmentMode === "organic"
      ? "Focus strictly on organic, biological, and eco-friendly cultural methods, botanical sprays, and bio-pesticides (e.g. Trichoderma, Neem extract, Bacillus thuringiensis)."
      : input.treatmentMode === "chemical"
      ? "Provide targeted, fast-acting conventional chemical treatments with approved active ingredients, exact safe dosages, and pre-harvest intervals."
      : "Provide an Integrated Pest & Disease Management (IPM) approach combining sanitation/cultural methods, bio-agents, and precise, judicious chemical treatments.";

  const prompt = `
You are AgriNova's Senior Agricultural Plant Pathology & Agronomy AI Specialist.
An expert agronomist is issuing a formal treatment prescription for a registered farmer in Bangladesh.

Crop: ${input.cropType}
Reported Issue: ${input.problemTitle}
Symptoms & Details: ${input.problemDescription}
Urgency Level: ${input.urgency || "NORMAL"}
Treatment Mode Strategy: ${input.treatmentMode || "integrated"}
${input.farmDetails ? `Farm Details: ${input.farmDetails}` : ""}

Strategy Instructions:
${modeInstruction}

Formulate a rigorous, practical, expert diagnosis and actionable treatment plan tailored to Bangladeshi agricultural conditions.

Return ONLY a valid JSON object matching exactly this structure:
{
  "diagnosis": "Precise agronomic diagnosis explaining the causal organism (pathogen/pest/deficiency), stage of progression, and key identifying symptom.",
  "prescriptions": [
    "Specific input with formulation and exact dilution (e.g., 'Mancozeb 75% WP @ 2.5g/L of water' or 'Cartap Hydrochloride 50 SP @ 1g/L')",
    "Secondary input, surfactant, or bio-stimulant (e.g., 'Agricultural spreader/sticker @ 0.5ml/L to enhance leaf adherence')"
  ],
  "treatmentSteps": [
    "1. Field Sanitation: Immediately remove and safely dispose of severely infected leaves/whorls outside the plot.",
    "2. Application Timing: Spray during calm early morning or late afternoon hours covering both upper and lower leaf surfaces.",
    "3. Water & Soil Management: Regulate irrigation to avoid stagnant water and reduce humidity around the crop canopy.",
    "4. Nutritional Support: Apply balanced micronutrient foliar spray once initial symptoms subside to accelerate plant recovery."
  ],
  "followUpDays": 7,
  "additionalNotes": "Safety advice: Wear protective gloves and mask during spray. Pre-harvest interval (PHI): 14 days. Avoid application if rain is forecasted within 4 hours."
}

Rules:
1. Return ONLY valid JSON, do NOT wrap with markdown fences or explanations.
2. Formulate 2 to 4 specific prescriptions with precise dosages.
3. Formulate 3 to 5 clear, sequential action plan steps.
4. followUpDays must be an integer between 5 and 21.
`;

  const response = await ai.models.generateContent({
    model: "gemini-3.7-flash",
    contents: [
      {
        text: prompt,
      },
    ],
  });

  if (!response.text) {
    throw new Error("Gemini returned an empty response");
  }

  return response.text;
};