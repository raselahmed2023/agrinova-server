import { Request, Response } from "express";
import AppError from "../../../utils/AppError";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { BlogService } from "./blog.service";

const getAllBlogs = catchAsync(async (req: Request, res: Response) => {
  const query = {
    search: req.query.search as string,
    category: req.query.category as string,
    status: req.query.status as string,
    authorId: req.query.authorId as string,
    page: req.query.page ? Number(req.query.page) : undefined,
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    sortBy: req.query.sortBy as string,
    sortOrder: req.query.sortOrder as "asc" | "desc",
  };

  const result = await BlogService.getAllBlogsFromDB(query);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Blog articles retrieved successfully",
    meta: result.meta,
    data: result.blogs,
  });
});

const getSingleBlog = catchAsync(async (req: Request, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
  const result = await BlogService.getBlogByIdOrSlugFromDB(id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Blog article retrieved successfully",
    data: result,
  });
});

const createBlog = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "Authentication required");
  }

  const result = await BlogService.createBlogInDB(req.body, req.user);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Blog article published successfully",
    data: result,
  });
});

const updateBlog = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "Authentication required");
  }

  const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
  const result = await BlogService.updateBlogInDB(id, req.body, req.user);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Blog article updated successfully",
    data: result,
  });
});

const deleteBlog = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "Authentication required");
  }

  const id = Array.isArray(req.params.id) ? req.params.id[0] : (req.params.id as string);
  const result = await BlogService.deleteBlogFromDB(id, req.user);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Blog article deleted successfully",
    data: result,
  });
});

export const BlogController = {
  getAllBlogs,
  getSingleBlog,
  createBlog,
  updateBlog,
  deleteBlog,
};
