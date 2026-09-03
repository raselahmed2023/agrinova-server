import { z } from "zod";

const farmTypeEnum = z.enum([
  "Crop",
  "Orchard",
  "Poultry",
  "Livestock",
  "Fishery",
]);

const unitEnum = z.enum([
  "Bigha",
  "Acre",
  "Hectare",
  "Decimal",
]);

const statusEnum = z.enum([
  "Active",
  "Inactive",
]);

const createFarmBodySchema = z
  .object({
    name: z
      .string({
        message: "Farm name is required",
      })
      .trim()
      .min(
        1,
        "Farm name is required"
      ),

    farmType: farmTypeEnum,

    division: z
      .string({
        message: "Division is required",
      })
      .trim()
      .min(
        1,
        "Division is required"
      ),

    district: z
      .string({
        message: "District is required",
      })
      .trim()
      .min(
        1,
        "District is required"
      ),

    upazila: z
      .string({
        message: "Upazila is required",
      })
      .trim()
      .min(
        1,
        "Upazila is required"
      ),

    landArea: z
      .number()
      .positive(
        "Area must be greater than 0"
      )
      .optional(),

    unit: unitEnum.optional(),

    soilType: z
      .string()
      .trim()
      .optional(),

    coverImage: z
      .string()
      .url(
        "Invalid image URL"
      )
      .optional(),

    description: z
      .string()
      .trim()
      .optional(),

    status:
      statusEnum.optional(),
  })
  .superRefine(
    (data, ctx) => {
      const needsLand =
        data.farmType ===
          "Crop" ||
        data.farmType ===
          "Orchard" ||
        data.farmType ===
          "Fishery";

      const needsSoil =
        data.farmType ===
          "Crop" ||
        data.farmType ===
          "Orchard";

      if (
        needsLand &&
        !data.landArea
      ) {
        ctx.addIssue({
          code:
            z.ZodIssueCode.custom,
          path: ["landArea"],
          message:
            data.farmType ===
            "Fishery"
              ? "Pond or water area is required"
              : "Land area is required",
        });
      }

      if (
        needsLand &&
        !data.unit
      ) {
        ctx.addIssue({
          code:
            z.ZodIssueCode.custom,
          path: ["unit"],
          message:
            "Area unit is required",
        });
      }

      if (
        needsSoil &&
        !data.soilType?.trim()
      ) {
        ctx.addIssue({
          code:
            z.ZodIssueCode.custom,
          path: ["soilType"],
          message:
            "Soil type is required",
        });
      }
    }
  );

const updateFarmBodySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(
        1,
        "Farm name cannot be empty"
      )
      .optional(),

    farmType:
      farmTypeEnum.optional(),

    division: z
      .string()
      .trim()
      .min(
        1,
        "Division cannot be empty"
      )
      .optional(),

    district: z
      .string()
      .trim()
      .min(
        1,
        "District cannot be empty"
      )
      .optional(),

    upazila: z
      .string()
      .trim()
      .min(
        1,
        "Upazila cannot be empty"
      )
      .optional(),

    landArea: z
      .number()
      .positive(
        "Area must be greater than 0"
      )
      .optional(),

    unit: unitEnum.optional(),

    soilType: z
      .string()
      .trim()
      .optional(),

    coverImage: z
      .string()
      .url(
        "Invalid image URL"
      )
      .optional(),

    description: z
      .string()
      .trim()
      .optional(),

    status:
      statusEnum.optional(),
  })
  .superRefine(
    (data, ctx) => {
      if (!data.farmType) {
        return;
      }

      const needsLand =
        data.farmType ===
          "Crop" ||
        data.farmType ===
          "Orchard" ||
        data.farmType ===
          "Fishery";

      const needsSoil =
        data.farmType ===
          "Crop" ||
        data.farmType ===
          "Orchard";

      if (
        needsLand &&
        !data.landArea
      ) {
        ctx.addIssue({
          code:
            z.ZodIssueCode.custom,
          path: ["landArea"],
          message:
            data.farmType ===
            "Fishery"
              ? "Pond or water area is required"
              : "Land area is required",
        });
      }

      if (
        needsLand &&
        !data.unit
      ) {
        ctx.addIssue({
          code:
            z.ZodIssueCode.custom,
          path: ["unit"],
          message:
            "Area unit is required",
        });
      }

      if (
        needsSoil &&
        !data.soilType?.trim()
      ) {
        ctx.addIssue({
          code:
            z.ZodIssueCode.custom,
          path: ["soilType"],
          message:
            "Soil type is required",
        });
      }
    }
  );

const createFarmValidationSchema =
  z.object({
    body:
      createFarmBodySchema,
  });

const updateFarmValidationSchema =
  z.object({
    body:
      updateFarmBodySchema,
  });

export const FarmValidations = {
  createFarmValidationSchema,
  updateFarmValidationSchema,
};