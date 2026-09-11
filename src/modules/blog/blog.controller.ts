import {
  Request,
  Response,
} from "express";

import AppError from "../../utils/AppError";

import catchAsync from "../../utils/catchAsync";

import sendResponse from "../../utils/sendResponse";

import {
  BlogService,
} from "./blog.service";

const requireUser = (
  req: Request
) => {
  if (!req.user) {
    throw new AppError(
      401,
      "Authentication required"
    );
  }

  return req.user;
};

const getAllBlogs =
  catchAsync(
    async (
      req: Request,
      res: Response
    ) => {
      const result =
        await BlogService.getAllBlogsFromDB(
          {
            search:
              req.query
                .search as string,

            category:
              req.query
                .category as string,

            authorId:
              req.query
                .authorId as string,

            page:
              req.query.page
                ? Number(
                    req.query
                      .page
                  )
                : undefined,

            limit:
              req.query.limit
                ? Number(
                    req.query
                      .limit
                  )
                : undefined,
          }
        );

      sendResponse(res, {
        statusCode: 200,

        success: true,

        message:
          "Blog articles retrieved successfully",

        meta:
          result.meta,

        data:
          result.blogs,
      });
    }
  );

const getMyBlogs =
  catchAsync(
    async (
      req: Request,
      res: Response
    ) => {
      const user =
        requireUser(req);

      const result =
        await BlogService.getMyBlogsFromDB(
          user.id
        );

      sendResponse(res, {
        statusCode: 200,

        success: true,

        message:
          "Your articles retrieved successfully",

        data: result,
      });
    }
  );

const getSingleBlog =
  catchAsync(
    async (
      req: Request,
      res: Response
    ) => {
      const result =
        await BlogService.getBlogByIdOrSlugFromDB(
          String(
            req.params.id
          )
        );

      sendResponse(res, {
        statusCode: 200,

        success: true,

        message:
          "Blog article retrieved successfully",

        data: result,
      });
    }
  );

const createBlog =
  catchAsync(
    async (
      req: Request,
      res: Response
    ) => {
      const user =
        requireUser(req);

      const result =
        await BlogService.createBlogInDB(
          req.body,
          user
        );

      sendResponse(res, {
        statusCode: 201,

        success: true,

        message:
          "Blog article saved successfully",

        data: result,
      });
    }
  );

const updateBlog =
  catchAsync(
    async (
      req: Request,
      res: Response
    ) => {
      const user =
        requireUser(req);

      const result =
        await BlogService.updateBlogInDB(
          String(
            req.params.id
          ),
          req.body,
          user
        );

      sendResponse(res, {
        statusCode: 200,

        success: true,

        message:
          "Blog article updated successfully",

        data: result,
      });
    }
  );

const deleteBlog =
  catchAsync(
    async (
      req: Request,
      res: Response
    ) => {
      const user =
        requireUser(req);

      const result =
        await BlogService.deleteBlogFromDB(
          String(
            req.params.id
          ),
          user
        );

      sendResponse(res, {
        statusCode: 200,

        success: true,

        message:
          "Blog article deleted successfully",

        data: result,
      });
    }
  );

const addComment =
  catchAsync(
    async (
      req: Request,
      res: Response
    ) => {
      const user =
        requireUser(req);

      const result =
        await BlogService.addCommentInDB(
          String(
            req.params.id
          ),

          req.body.content,

          user
        );

      sendResponse(res, {
        statusCode: 201,

        success: true,

        message:
          "Comment added",

        data: result,
      });
    }
  );

const addReply =
  catchAsync(
    async (
      req: Request,
      res: Response
    ) => {
      const user =
        requireUser(req);

      const result =
        await BlogService.addReplyInDB(
          String(
            req.params.id
          ),

          String(
            req.params
              .commentId
          ),

          req.body.content,

          user
        );

      sendResponse(res, {
        statusCode: 201,

        success: true,

        message:
          "Reply added",

        data: result,
      });
    }
  );

const uploadImage =
  catchAsync(
    async (
      req: Request,
      res: Response
    ) => {
      requireUser(req);

      if (!req.file) {
        throw new AppError(
          400,
          "Image file is required"
        );
      }

      const result =
        await BlogService.uploadImageToImgBB(
          req.file
        );

      sendResponse(res, {
        statusCode: 201,

        success: true,

        message:
          "Image uploaded successfully",

        data: result,
      });
    }
  );

export const BlogController = {
  getAllBlogs,
  getMyBlogs,
  getSingleBlog,
  createBlog,
  updateBlog,
  deleteBlog,
  addComment,
  addReply,
  uploadImage,
};