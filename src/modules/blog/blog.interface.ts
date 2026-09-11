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

export interface IBlogReply {
  _id?: Types.ObjectId;
  userId: string;
  userName: string;
  userRole: "FARMER" | "EXPERT" | "ADMIN";
  content: string;
  createdAt?: Date;
}

export interface IBlogComment {
  _id?: Types.ObjectId;
  userId: string;
  userName: string;
  userRole: "FARMER" | "EXPERT" | "ADMIN";
  content: string;
  replies: IBlogReply[];
  createdAt?: Date;
}

export interface IBlog {
  title: string;
  slug: string;
  category: string;
  tags: string[];
  summary: string;
  content: string;
  images: string[];
  readTime: string;
  author: IBlogAuthor;
  status: "PUBLISHED" | "DRAFT";
  views: number;
  comments: IBlogComment[];
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
