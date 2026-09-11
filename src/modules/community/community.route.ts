import {
  Router,
} from "express";

import multer from "multer";

import authenticate from "../../middleware/authenticate";

import authorize from "../../middleware/authorize";

import validateRequest from "../../middleware/validateRequest";

import {
  CommunityController,
} from "./community.controller";

import {
  CommunityValidation,
} from "./community.validation";

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

/* ============================================================
   ADMIN MODERATION

   These must stay ABOVE dynamic post/farmer routes.
============================================================ */

router.get(
  "/admin/posts",

  authenticate,

  authorize(
    "ADMIN"
  ),

  CommunityController.getAdminPosts
);

router.patch(
  "/admin/posts/:postId/remove",

  authenticate,

  authorize(
    "ADMIN"
  ),

  validateRequest(
    CommunityValidation.moderatePostSchema
  ),

  CommunityController.removePostByAdmin
);

router.post(
  "/admin/posts/:postId/warn",

  authenticate,

  authorize(
    "ADMIN"
  ),

  validateRequest(
    CommunityValidation.moderatePostSchema
  ),

  CommunityController.warnFarmerByAdmin
);



router.get(
  "/feed",

  CommunityController.getFeed
);


router.get(
  "/farmers/:farmerId",

  authenticate,

  authorize(
    "FARMER"
  ),

  CommunityController.getFarmerProfile
);



router.post(
  "/upload-image",

  authenticate,

  authorize(
    "FARMER"
  ),

  upload.single(
    "image"
  ),

  CommunityController.uploadImage
);



router.post(
  "/posts",

  authenticate,

  authorize(
    "FARMER"
  ),

  validateRequest(
    CommunityValidation.createPostSchema
  ),

  CommunityController.createPost
);

router.patch(
  "/posts/:postId",

  authenticate,

  authorize(
    "FARMER"
  ),

  validateRequest(
    CommunityValidation.updatePostSchema
  ),

  CommunityController.updatePost
);

router.delete(
  "/posts/:postId",

  authenticate,

  authorize(
    "FARMER"
  ),

  CommunityController.deleteOwnPost
);


router.post(
  "/posts/:postId/like",

  authenticate,

  authorize(
    "FARMER"
  ),

  CommunityController.toggleLike
);



router.post(
  "/posts/:postId/comments",

  authenticate,

  authorize(
    "FARMER"
  ),

  validateRequest(
    CommunityValidation.commentSchema
  ),

  CommunityController.addComment
);



router.post(
  "/posts/:postId/comments/:commentId/replies",

  authenticate,

  authorize(
    "FARMER"
  ),

  validateRequest(
    CommunityValidation.replySchema
  ),

  CommunityController.addReply
);

export default router;