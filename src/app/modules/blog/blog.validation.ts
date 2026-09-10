import { z } from "zod";

const createBlogValidationSchema = z.object({
  body: z.object({
    title: z.string().min(3, "Title must be at least 3 characters"),
    category: z.string().min(2, "Category is required"),
    tags: z.array(z.string()).optional(),
    summary: z.string().min(10, "Summary must be at least 10 characters"),
    content: z.string().min(20, "Content must be at least 20 characters"),
    images: z
      .array(z.string().url("Must be a valid image URL"))
      .min(1, "At least 1 image is required")
      .max(2, "Maximum 2 images allowed"),
    readTime: z.string().optional(),
    status: z.enum(["PUBLISHED", "DRAFT"]).optional(),
  }),
});

const updateBlogValidationSchema = z.object({
  body: z.object({
    title: z.string().min(3).optional(),
    category: z.string().min(2).optional(),
    tags: z.array(z.string()).optional(),
    summary: z.string().min(10).optional(),
    content: z.string().min(20).optional(),
    images: z
      .array(z.string().url("Must be a valid image URL"))
      .min(1, "At least 1 image is required")
      .max(2, "Maximum 2 images allowed")
      .optional(),
    readTime: z.string().optional(),
    status: z.enum(["PUBLISHED", "DRAFT"]).optional(),
  }),
});

export const BlogValidations = {
  createBlogValidationSchema,
  updateBlogValidationSchema,
};
