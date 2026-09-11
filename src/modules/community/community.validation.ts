import { z } from "zod";

const imageArray = z
  .array(z.string().url())
  .max(4)
  .optional();

const createPostSchema = z.object({
  body: z.object({
    content: z
      .string()
      .trim()
      .min(1)
      .max(5000),

    images: imageArray,
  }),
});

const updatePostSchema = z.object({
  body: z
    .object({
      content: z
        .string()
        .trim()
        .min(1)
        .max(5000)
        .optional(),

      images: imageArray,
    })
    .refine(
      (value) =>
        value.content !== undefined ||
        value.images !== undefined,
      {
        message:
          "Provide content or images to update",
      }
    ),
});

const commentSchema = z.object({
  body: z.object({
    content: z
      .string()
      .trim()
      .min(1)
      .max(1800),
  }),
});

const replySchema = z.object({
  body: z.object({
    content: z
      .string()
      .trim()
      .min(1)
      .max(1200),
  }),
});

const moderatePostSchema = z.object({
  body: z.object({
    reason: z
      .string()
      .trim()
      .min(
        5,
        "Moderation reason must be at least 5 characters"
      )
      .max(800),
  }),
});

export const CommunityValidation = {
  createPostSchema,
  updatePostSchema,
  commentSchema,
  replySchema,
  moderatePostSchema,
};