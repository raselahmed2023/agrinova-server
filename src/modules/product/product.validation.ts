import { z } from "zod";

const createProductValidationSchema = z.object({
  body: z.object({
    title: z.string({ message: "Title is required" }).min(1, "Title cannot be empty"),
    description: z.string({ message: "Description is required" }).min(1, "Description cannot be empty"),
    price: z
      .number({ message: "Price is required" })
      .min(0, "Price must be greater than or equal to 0"),
    category: z.enum([
      "seeds",
      "fertilizers",
      "pesticides",
      "equipment",
      "crops",
      "livestock",
      "other",
    ]),
    quantity: z
      .number({ message: "Quantity is required" })
      .min(0, "Quantity must be greater than or equal to 0"),
    unit: z.string({ message: "Unit is required" }).min(1, "Unit cannot be empty"),
    images: z.array(z.string()).optional(),
    sellerName: z.string().optional(),
    sellerContact: z.string().optional(),
    location: z.string().optional(),
    status: z.enum(["available", "out_of_stock"]).optional().default("available"),
    isFeatured: z.boolean().optional().default(false),
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
      page: z.string().optional(),
      limit: z.string().optional(),
    })
    .optional(),
});

const updateProductValidationSchema = z.object({
  body: z.object({
    title: z.string().min(1, "Title cannot be empty").optional(),
    description: z.string().min(1, "Description cannot be empty").optional(),
    price: z
      .number()
      .min(0, "Price must be greater than or equal to 0")
      .optional(),
    category: z
      .enum([
        "seeds",
        "fertilizers",
        "pesticides",
        "equipment",
        "crops",
        "livestock",
        "other",
      ])
      .optional(),
    quantity: z
      .number()
      .min(0, "Quantity must be greater than or equal to 0")
      .optional(),
    unit: z.string().min(1, "Unit cannot be empty").optional(),
    images: z.array(z.string()).optional(),
    sellerName: z.string().optional(),
    sellerContact: z.string().optional(),
    location: z.string().optional(),
    status: z.enum(["available", "out_of_stock"]).optional(),
    isFeatured: z.boolean().optional(),
  }),
});

export const ProductValidation = {
  createProductValidationSchema,
  getProductsQueryValidationSchema,
  updateProductValidationSchema,
};
