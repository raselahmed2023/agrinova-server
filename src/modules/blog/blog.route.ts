import {
  Router,
} from "express";

import multer from "multer";

import authenticate from "../../middleware/authenticate";

import authorize from "../../middleware/authorize";

import validateRequest from "../../middleware/validateRequest";

import {
  BlogController,
} from "./blog.controller";

import {
  BlogValidations,
} from "./blog.validation";

const router =
  Router();

const upload =
  multer({
    storage:
      multer.memoryStorage(),

    limits: {
      fileSize:
        8 *
        1024 *
        1024,
    },
  });



router.get(
  "/",
  BlogController.getAllBlogs
);



router.get(
  "/mine",

  authenticate,

  authorize("EXPERT"),

  BlogController.getMyBlogs
);

router.post(
  "/upload-image",

  authenticate,

  authorize("EXPERT"),

  upload.single(
    "image"
  ),

  BlogController.uploadImage
);

router.post(
  "/",

  authenticate,

  authorize("EXPERT"),

  validateRequest(
    BlogValidations.createBlogValidationSchema
  ),

  BlogController.createBlog
);



router.post(
  "/:id/comments",

  authenticate,

  authorize(
    "FARMER",
    "EXPERT",
    "ADMIN"
  ),

  validateRequest(
    BlogValidations.createCommentValidationSchema
  ),

  BlogController.addComment
);

router.post(
  "/:id/comments/:commentId/replies",

  authenticate,

  authorize(
    "FARMER",
    "EXPERT",
    "ADMIN"
  ),

  validateRequest(
    BlogValidations.createReplyValidationSchema
  ),

  BlogController.addReply
);



router.patch(
  "/:id",

  authenticate,

  authorize("EXPERT"),

  validateRequest(
    BlogValidations.updateBlogValidationSchema
  ),

  BlogController.updateBlog
);

router.delete(
  "/:id",

  authenticate,

  authorize("EXPERT"),

  BlogController.deleteBlog
);



router.get(
  "/:id",

  BlogController.getSingleBlog
);

export const BlogRoutes =
  router;