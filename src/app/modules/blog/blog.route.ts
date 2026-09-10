import { Router } from "express";
import authenticate from "../../../middleware/authenticate";
import authorize from "../../../middleware/authorize";
import validateRequest from "../../../middleware/validateRequest";
import { BlogController } from "./blog.controller";
import { BlogValidations } from "./blog.validation";

const router = Router();

// Public routes - accessible without login
router.get("/", BlogController.getAllBlogs);
router.get("/:id", BlogController.getSingleBlog);

// Protected routes - for Experts and Admins
router.post(
  "/",
  authenticate,
  authorize("EXPERT", "ADMIN"),
  validateRequest(BlogValidations.createBlogValidationSchema),
  BlogController.createBlog
);

router.patch(
  "/:id",
  authenticate,
  authorize("EXPERT", "ADMIN"),
  validateRequest(BlogValidations.updateBlogValidationSchema),
  BlogController.updateBlog
);

router.delete(
  "/:id",
  authenticate,
  authorize("EXPERT", "ADMIN"),
  BlogController.deleteBlog
);

export const BlogRoutes = router;
