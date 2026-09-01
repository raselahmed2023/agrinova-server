import { z } from "zod";

const updateExpertProfileValidationSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    avatar: z.string().optional(),
    profileImage: z.string().optional(),
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

const AvailabilitySlotSchema = z.object({
  day: z.enum([
    "SATURDAY",
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
  ]),
  enabled: z.boolean(),
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid startTime format (HH:mm)")
    .optional(),
  endTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid endTime format (HH:mm)")
    .optional(),
});

const updateAvailabilityValidationSchema = z.object({
  body: z.object({
    availabilityStatus: z.enum(["AVAILABLE", "UNAVAILABLE"]),
    availabilitySlots: z.array(AvailabilitySlotSchema),
  }),
});

export const ExpertValidations = {
  updateExpertProfileValidationSchema,
  updateAvailabilityValidationSchema,
  AvailabilitySlotSchema,
};
