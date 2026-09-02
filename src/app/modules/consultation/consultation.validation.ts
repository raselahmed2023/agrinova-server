import { z } from "zod";

const createConsultationValidationSchema = z.object({
  body: z.object({
    cropType: z.string({ message: "Crop type is required" }),
    cropName: z.string().optional(),
    problemTitle: z.string({ message: "Problem title is required" }),
    problemDescription: z.string({
      message: "Problem description is required",
    }),
    farmId: z.string().optional(),
    farmName: z.string().optional(),
    district: z.string().optional(),
    images: z.array(z.string()).optional(),
    urgency: z.enum(["LOW", "MEDIUM", "HIGH", "EMERGENCY"]).optional(),
    preferredDate: z.string().optional(),
    preferredTime: z.string().optional(),
    notes: z.string().optional(),
  }),
});

const rejectConsultationValidationSchema = z.object({
  body: z
    .object({
      reason: z.string().optional(),
    })
    .optional(),
});

const scheduleConsultationValidationSchema = z.object({
  body: z.object({
    scheduledAt: z.string().optional(),
    scheduledDate: z.string().optional(),
    scheduledTime: z.string().optional(),
    meetingLink: z.string().optional(),
    notes: z.string().optional(),
  }),
});

const updateStatusValidationSchema = z.object({
  body: z.object({
    status: z.enum([
      "PENDING",
      "ACCEPTED",
      "SCHEDULED",
      "ONGOING",
      "COMPLETED",
      "REJECTED",
      "CANCELLED",
    ]),
    reason: z.string().optional(),
  }),
});

const recommendationValidationSchema = z.object({
  body: z.object({
    recommendation: z
      .string({ message: "Recommendation is required" })
      .trim()
      .min(10, "Recommendation must be at least 10 characters")
      .max(3000, "Recommendation cannot exceed 3000 characters"),
    diagnosis: z.string().optional(),
    prescriptions: z.array(z.string()).optional(),
    treatmentSteps: z.array(z.string()).optional(),
    followUpDate: z.string().optional(),
    additionalNotes: z.string().optional(),
  }),
});

export const ConsultationValidations = {
  createConsultationValidationSchema,
  rejectConsultationValidationSchema,
  scheduleConsultationValidationSchema,
  updateStatusValidationSchema,
  recommendationValidationSchema,
  createRecommendationValidationSchema: recommendationValidationSchema,
};
