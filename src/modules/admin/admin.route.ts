import {
  Router,
} from "express";

import authenticate from "../../middleware/authenticate";
import authorize from "../../middleware/authorize";

import {
  AdminController,
} from "./admin.controller";

const router =
  Router();


router.use(
  authenticate,
  authorize("ADMIN")
);



router.get(
  "/dashboard",
  AdminController.getDashboard
);


router.get(
  "/users",
  AdminController.getUsers
);

router.get(
  "/users/:userId",
  AdminController.getUserById
);

router.patch(
  "/users/:userId/block",
  AdminController.blockUser
);

router.patch(
  "/users/:userId/unblock",
  AdminController.unblockUser
);



router.get(
  "/experts/pending",
  AdminController.getPendingExperts
);

router.get(
  "/experts/:expertId",
  AdminController.getExpertById
);

router.patch(
  "/experts/:expertId/approve",
  AdminController.approveExpert
);

router.patch(
  "/experts/:expertId/reject",
  AdminController.rejectExpert
);


router.get(
  "/farms",
  AdminController.getAdminFarms
);

router.get(
  "/farms/:farmId",
  AdminController.getAdminFarmById
);


router.get(
  "/marketplace/products",
  AdminController.getAdminProducts
);

/**
 * Single product
 */
router.get(
  "/marketplace/products/:productId",
  AdminController.getAdminProductById
);

/**
 * Approve farmer listing
 */
router.patch(
  "/marketplace/products/:productId/approve",
  AdminController.approveProduct
);


router.patch(
  "/marketplace/products/:productId/reject",
  AdminController.rejectProduct
);

/**
 * Disable an approved product
 */
router.patch(
  "/marketplace/products/:productId/disable",
  AdminController.disableProduct
);


router.patch(
  "/marketplace/products/:productId/restore",
  AdminController.restoreProduct
);

/**
 * Soft delete product
 */
router.delete(
  "/marketplace/products/:productId",
  AdminController.removeProduct
);



router.get(
  "/consultations",
  AdminController.getAdminConsultations
);

router.get(
  "/consultations/:consultationId",
  AdminController.getAdminConsultationById
);



router.get(
  "/analytics",
  AdminController.getAdminAnalytics
);



router.get(
  "/profile",
  AdminController.getAdminProfile
);

router.patch(
  "/profile",
  AdminController.updateAdminProfile
);

export const AdminRoutes =
  router;