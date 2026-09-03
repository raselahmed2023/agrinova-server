import { z } from "zod";

export const createInvestmentProjectSchema = z.object({
  projectTitle: z
    .string()
    .trim()
    .min(3, "Project title is required"),

  nidNumber: z
    .string()
    .trim()
    .regex(
      /^(\d{10}|\d{13}|\d{17})$/,
      "NID number must be 10, 13 or 17 digits"
    ),

  category: z
    .string()
    .trim()
    .min(1, "Category is required"),

  requiredInvestment: z.coerce
    .number()
    .positive("Required investment must be greater than 0"),

  projectedProfit: z.coerce
    .number()
    .min(0, "Projected profit cannot be negative"),

  duration: z
    .string()
    .trim()
    .min(1, "Duration is required"),

  location: z
    .string()
    .trim()
    .min(2, "Location is required"),

  projectImage: z
    .string()
    .trim()
    .min(1, "Project image is required"),

  description: z
    .string()
    .trim()
    .min(10, "Description must be at least 10 characters"),

  supportingDocument: z
    .string()
    .trim()
    .min(1, "Supporting document is required"),
});