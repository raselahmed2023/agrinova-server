import { z } from "zod";

const updateExpertProfileValidationSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    avatar: z.string().optional(),
    title: z.string().optional(),
    specialization: z.union([z.array(z.string()), z.string()]).optional(),
    bio: z.string().optional(),
    experienceYears: z.number().optional(),
    qualification: z.string().optional(),
    institution: z.string().optional(),
    consultationFee: z.number().optional(),
    languages: z.array(z.string()).optional(),
    location: z.string().optional(),
  }),
});

const updateAvailabilityValidationSchema = z.object({
  body: z.object({
    isAcceptingConsultations: z.boolean().optional(),
    timezone: z.string().optional(),
    slotDurationMinutes: z.number().optional(),
    weeklySchedule: z
      .array(
        z.object({
          day: z.string(),
          label: z.string(),
          isAvailable: z.boolean(),
          slots: z.array(
            z.object({
              id: z.string(),
              start: z.string(),
              end: z.string(),
            })
          ),
        })
      )
      .optional(),
    customDatesOff: z.array(z.string()).optional(),
    availabilityStatus: z
      .enum(["AVAILABLE", "BUSY", "OFFLINE", "PAUSED"])
      .optional(),
  }),
});

export const ExpertValidations = {
  updateExpertProfileValidationSchema,
  updateAvailabilityValidationSchema,
};
