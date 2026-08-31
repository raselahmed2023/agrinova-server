import { z } from "zod";

const createConsultationValidationSchema = z.object({
  body: z.object({
    cropType: z.string({ message: "Crop type is required" }),
    problemTitle: z.string({ message: "Problem title is required" }),
    problemDescription: z.string({ message: "Problem description is required" }),
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
    scheduledDate: z.string({ message: "Scheduled date is required" }),
    scheduledTime: z.string({ message: "Scheduled time is required" }),
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

const createRecommendationValidationSchema = z.object({
  body: z.object({
    diagnosis: z.string({ message: "Diagnosis is required" }),
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
  createRecommendationValidationSchema,
};
