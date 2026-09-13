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

const replySchema = new Schema(
  {
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    userRole: { type: String, enum: ["FARMER", "EXPERT", "ADMIN"], required: true },
    content: { type: String, required: true, trim: true, maxlength: 1000 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const commentSchema = new Schema(
  {
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    userRole: { type: String, enum: ["FARMER", "EXPERT", "ADMIN"], required: true },
    content: { type: String, required: true, trim: true, maxlength: 1500 },
    replies: { type: [replySchema], default: [] },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const blogSchema = new Schema<IBlogDocument>(
  {
    title: { type: String, required: true, trim: true, maxlength: 180 },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
    category: { type: String, required: true, trim: true, index: true },
    tags: { type: [String], default: [], index: true },
    summary: { type: String, required: true, trim: true, maxlength: 500 },
    content: { type: String, required: true },
    images: {
      type: [String],
      required: true,
      validate: {
        validator: (value: string[]) => Array.isArray(value) && value.length >= 1 && value.length <= 2,
        message: "A blog must have 1 or 2 images",
      },
    },
    readTime: { type: String, default: "4 min read" },
    author: { type: blogAuthorSchema, required: true },
    status: { type: String, enum: ["PUBLISHED", "DRAFT"], default: "PUBLISHED", index: true },
    views: { type: Number, default: 0 },
    comments: { type: [commentSchema], default: [] },
  },
  { timestamps: true }
);

blogSchema.index({ title: "text", summary: "text", tags: "text" });

export const Blog = mongoose.models.Blog || model<IBlogDocument>("Blog", blogSchema);