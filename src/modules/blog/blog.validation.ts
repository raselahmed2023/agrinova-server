import { z } from "zod";

const createBlogValidationSchema = z.object({
  body: z.object({
    title: z.string().trim().min(5).max(180),
    category: z.string().trim().min(2).max(80),
    tags: z.array(z.string().trim().min(1).max(40)).max(8).optional(),
    summary: z.string().trim().min(20).max(500),
    content: z.string().trim().min(80).max(30000),
    images: z.array(z.string().url()).min(1).max(2),
    status: z.enum(["PUBLISHED", "DRAFT"]).optional(),
  }),
});

const updateBlogValidationSchema = z.object({
  body: z.object({
    title: z.string().trim().min(5).max(180).optional(),
    category: z.string().trim().min(2).max(80).optional(),
    tags: z.array(z.string().trim().min(1).max(40)).max(8).optional(),
    summary: z.string().trim().min(20).max(500).optional(),
    content: z.string().trim().min(80).max(30000).optional(),
    images: z.array(z.string().url()).min(1).max(2).optional(),
    status: z.enum(["PUBLISHED", "DRAFT"]).optional(),
  }),
});

const createCommentValidationSchema = z.object({
  body: z.object({ content: z.string().trim().min(2).max(1500) }),
});

const createReplyValidationSchema = z.object({
  body: z.object({ content: z.string().trim().min(2).max(1000) }),
});

export const BlogValidations = {
  createBlogValidationSchema,
  updateBlogValidationSchema,
  createCommentValidationSchema,
  createReplyValidationSchema,
};
