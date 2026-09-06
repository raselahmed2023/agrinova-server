import { Document, Types } from "mongoose";

export interface IBlogAuthor {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  title?: string;
  specialization?: string | string[];
  bio?: string;
}

export interface IBlog {
  title: string;
  slug: string;
  category: string;
  tags: string[];
  summary: string;
  content: string;
  images: string[]; // 1-2 images
  readTime: string;
  author: IBlogAuthor;
  status: "PUBLISHED" | "DRAFT";
  views: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IBlogDocument extends IBlog, Document {
  _id: Types.ObjectId;
}

export interface IBlogQuery {
  search?: string;
  category?: string;
  status?: string;
  authorId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
