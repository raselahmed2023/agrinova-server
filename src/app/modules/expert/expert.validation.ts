import { z } from "zod";

const timeSchema = z
  .string()
  .regex(
    /^([01]\d|2[0-3]):[0-5]\d$/,
    "Invalid time format (HH:mm)",
  );

const updateExpertProfileValidationSchema = z.object({
  body: z.object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name cannot exceed 100 characters")
      .optional(),

    phone: z
      .string()
      .trim()
      .regex(
        /^01[3-9]\d{8}$/,
        "Invalid Bangladeshi phone number",
      )
      .optional(),

    avatar: z
      .string()
      .trim()
      .optional(),

    profileImage: z
      .string()
      .trim()
      .optional(),

    title: z
      .string()
      .trim()
      .min(2, "Title must be at least 2 characters")
      .max(120, "Title cannot exceed 120 characters")
      .optional(),

    specialization: z
      .union([
        z
          .array(
            z
              .string()
              .trim()
              .min(
                1,
                "Specialization cannot be empty",
              ),
          )
          .max(
            20,
            "A maximum of 20 specializations is allowed",
          ),
        z
          .string()
          .trim()
          .min(
            1,
            "Specialization cannot be empty",
          ),
      ])
      .optional(),

    bio: z
      .string()
      .trim()
      .max(
        3000,
        "Bio cannot exceed 3000 characters",
      )
      .optional(),

    experienceYears: z
      .number({
        message:
          "Experience years must be a number",
      })
      .finite(
        "Experience years must be a valid number",
      )
      .int(
        "Experience years must be a whole number",
      )
      .min(
        0,
        "Experience years cannot be negative",
      )
      .max(
        80,
        "Experience years cannot exceed 80",
      )
      .optional(),

    qualification: z
      .string()
      .trim()
      .max(
        500,
        "Qualification cannot exceed 500 characters",
      )
      .optional(),

    institution: z
      .string()
      .trim()
      .max(
        200,
        "Institution cannot exceed 200 characters",
      )
      .optional(),

    consultationFee: z
      .number({
        message:
          "Consultation fee must be a number",
      })
      .finite(
        "Consultation fee must be a valid number",
      )
      .positive(
        "Consultation fee must be greater than 0",
      )
      .optional(),

    languages: z
      .array(
        z
          .string()
          .trim()
          .min(
            1,
            "Language cannot be empty",
          ),
      )
      .max(
        20,
        "A maximum of 20 languages is allowed",
      )
      .optional(),

    location: z
      .string()
      .trim()
      .max(
        250,
        "Location cannot exceed 250 characters",
      )
      .optional(),
  }),
});

const AvailabilitySlotSchema = z
  .object({
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

    startTime: timeSchema.optional(),

    endTime: timeSchema.optional(),
  })
  .superRefine((slot, ctx) => {
    if (!slot.enabled) {
      return;
    }

    if (!slot.startTime) {
      ctx.addIssue({
        code: "custom",
        path: ["startTime"],
        message:
          "Start time is required for an enabled availability slot",
      });
    }

    if (!slot.endTime) {
      ctx.addIssue({
        code: "custom",
        path: ["endTime"],
        message:
          "End time is required for an enabled availability slot",
      });
    }

    if (
      slot.startTime &&
      slot.endTime &&
      slot.startTime >= slot.endTime
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["endTime"],
        message:
          "End time must be later than start time",
      });
    }
  });

const updateAvailabilityValidationSchema = z.object({
  body: z.object({
    availabilityStatus: z.enum([
      "AVAILABLE",
      "UNAVAILABLE",
    ]),

    availabilitySlots: z
      .array(
        AvailabilitySlotSchema,
      )
      .max(
        7,
        "A maximum of 7 availability slots is allowed",
      )
      .superRefine((slots, ctx) => {
        const seenDays =
          new Set<string>();

        slots.forEach(
          (slot, index) => {
            if (
              seenDays.has(
                slot.day,
              )
            ) {
              ctx.addIssue({
                code:
                  "custom",
                path: [
                  index,
                  "day",
                ],
                message:
                  "Duplicate availability day is not allowed",
              });

              return;
            }

            seenDays.add(
              slot.day,
            );
          },
        );
      }),
  }),
});

export const ExpertValidations = {
  updateExpertProfileValidationSchema,
  updateAvailabilityValidationSchema,
  AvailabilitySlotSchema,
};
