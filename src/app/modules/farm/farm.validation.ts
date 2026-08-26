import { z } from 'zod';

const createFarmValidationSchema = z.object({
  body: z.object({
    name: z.string({ message: 'Farm name is required' }),
    division: z.string({ message: 'Division is required' }),
    district: z.string({ message: 'District is required' }),
    landArea: z.number({ message: 'Land area is required' }),
    unit: z.enum(['Bigha', 'Acre', 'Hectare', 'Decimal']).optional(),
    soilType: z.string({ message: 'Soil type is required' }),
    coverImage: z.string().url('Invalid image URL').optional(),
    description: z.string().optional(),
    status: z.enum(['Active', 'Inactive']).optional(),
  }),
});

const updateFarmValidationSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    division: z.string().optional(),
    district: z.string().optional(),
    landArea: z.number().optional(),
    unit: z.enum(['Bigha', 'Acre', 'Hectare', 'Decimal']).optional(),
    soilType: z.string().optional(),
    coverImage: z.string().url('Invalid image URL').optional(),
    description: z.string().optional(),
    status: z.enum(['Active', 'Inactive']).optional(),
  }),
});

export const FarmValidations = {
  createFarmValidationSchema,
  updateFarmValidationSchema,
};