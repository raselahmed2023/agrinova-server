import mongoose, { Schema, model } from "mongoose";
import { IBlogDocument } from "./blog.interface";

const blogAuthorSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    avatar: { type: String },
    title: { type: String, default: "Agricultural Specialist" },
    specialization: { type: Schema.Types.Mixed, default: "General Farming" },
    bio: { type: String },
  },
  { _id: false }
);

const blogSchema = new Schema<IBlogDocument>(
  {
    title: {
      type: String,
      required: [true, "Blog title is required"],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, "Blog slug is required"],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    category: {
      type: String,
      required: [true, "Blog category is required"],
      trim: true,
      index: true,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    summary: {
      type: String,
      required: [true, "Blog summary is required"],
      trim: true,
    },
    content: {
      type: String,
      required: [true, "Blog content is required"],
    },
    images: {
      type: [String],
      required: [true, "At least 1 image is required"],
      validate: {
        validator: function (val: string[]) {
          return Array.isArray(val) && val.length >= 1 && val.length <= 2;
        },
        message: "A blog must have between 1 and 2 pictures",
      },
    },
    readTime: {
      type: String,
      default: "4 min read",
    },
    author: {
      type: blogAuthorSchema,
      required: [true, "Author information is required"],
    },
    status: {
      type: String,
      enum: ["PUBLISHED", "DRAFT"],
      default: "PUBLISHED",
      index: true,
    },
    views: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

blogSchema.index({ title: "text", summary: "text", tags: "text" });

export const Blog =
  mongoose.models.Blog || model<IBlogDocument>("Blog", blogSchema);
