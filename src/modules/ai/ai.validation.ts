import { z } from "zod";


export const farmingAssistantSchema = z.object({
  body: z.object({
    message: z
      .string()
      .trim()
      .min(2, "Message is required")
      .max(2000, "Message is too long"),

    farmId: z
      .string()
      .trim()
      .min(1, "Invalid farm ID")
      .optional(),

    context: z
      .string()
      .trim()
      .max(3000, "Context is too long")
      .optional(),
  }),
});


export const smartFarmingRecommendationSchema = z.object({
  body: z.object({
    farmId: z
      .string()
      .trim()
      .min(1, "Farm is required"),

    problem: z
      .string()
      .trim()
      .min(
        5,
        "Please describe your farming problem clearly"
      )
      .max(
        2000,
        "Problem description is too long"
      ),
  }),
});


export const AIValidations = {
  farmingAssistantSchema,
  smartFarmingRecommendationSchema,
};