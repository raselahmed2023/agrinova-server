import { z } from "zod";

export const farmingAssistantSchema = z.object({
  body: z.object({
    message: z
      .string()
      .trim()
      .min(2, "Message is required")
      .max(2000, "Message is too long"),

    farmId: z.string().optional(),

    context: z
      .string()
      .trim()
      .max(3000, "Context is too long")
      .optional(),
  }),
});

export const cropRecommendationSchema = z.object({
  body: z.object({
    location: z
      .string()
      .trim()
      .min(2, "Location is required"),

    soilType: z
      .string()
      .trim()
      .min(2, "Soil type is required"),

    season: z
      .string()
      .trim()
      .min(2, "Season is required"),

    waterAvailability: z.enum([
      "LOW",
      "MEDIUM",
      "HIGH",
    ]),

    farmSize: z.number().positive().optional(),

    notes: z
      .string()
      .trim()
      .max(1000, "Notes are too long")
      .optional(),
  }),
});