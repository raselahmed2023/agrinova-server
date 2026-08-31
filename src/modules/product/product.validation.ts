import { z } from "zod";

const categorySchema = z.enum([
  "seeds",
  "fertilizers",
  "pesticides",
  "equipment",
  "crops",
  "livestock",
  "other",
]);

const statusSchema = z.enum([
  "available",
  "out_of_stock",
]);

const createProductValidationSchema = z.object({
  body: z.object({
    title: z
      .string({ message: "Title is required" })
      .trim()
      .min(1, "Title cannot be empty"),

    description: z
      .string({ message: "Description is required" })
      .trim()
      .min(1, "Description cannot be empty"),

    price: z
      .number({ message: "Price is required" })
      .positive("Price must be greater than 0"),

    category: categorySchema,

    quantity: z
      .number({ message: "Quantity is required" })
      .positive("Quantity must be greater than 0"),

    unit: z
      .string({ message: "Unit is required" })
      .trim()
      .min(1, "Unit cannot be empty"),

    images: z.array(z.string().url()).max(5).optional(),

    sellerContact: z
      .string()
      .trim()
      .max(50)
      .optional(),

    location: z
      .string()
      .trim()
      .max(200)
      .optional(),

    status: statusSchema.optional().default("available"),
  }),
});

const getProductsQueryValidationSchema = z.object({
  query: z
    .object({
      search: z.string().optional(),
      category: z.string().optional(),
      status: z.string().optional(),
      minPrice: z.string().optional(),
      maxPrice: z.string().optional(),
      sortBy: z.string().optional(),
      sortOrder: z.enum(["asc", "desc"]).optional(),
      sort: z.string().optional(),
      page: z.string().optional(),
      limit: z.string().optional(),
    })
    .optional(),
});

const getMyListingsQueryValidationSchema = z.object({
  query: z
    .object({
      search: z.string().optional(),
      category: z.string().optional(),
      status: z.string().optional(),
      minPrice: z.string().optional(),
      maxPrice: z.string().optional(),
      sortBy: z.string().optional(),
      sortOrder: z.enum(["asc", "desc"]).optional(),
      page: z.string().optional(),
      limit: z.string().optional(),
    })
    .optional(),
});

const updateProductValidationSchema = z.object({
  body: z
    .object({
      title: z.string().trim().min(1).optional(),
      description: z.string().trim().min(1).optional(),
      price: z.number().positive().optional(),
      category: categorySchema.optional(),
      quantity: z.number().min(0).optional(),
      unit: z.string().trim().min(1).optional(),
      images: z.array(z.string().url()).max(5).optional(),
      sellerContact: z.string().trim().max(50).optional(),
      location: z.string().trim().max(200).optional(),
      status: statusSchema.optional(),
    })
    .refine((body) => Object.keys(body).length > 0, {
      message: "At least one field is required",
    }),
});

export const ProductValidation = {
  createProductValidationSchema,
  getProductsQueryValidationSchema,
  getMyListingsQueryValidationSchema,
  updateProductValidationSchema,
};
