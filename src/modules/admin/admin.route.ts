import { Router } from "express";
import authenticate from "../../middleware/authenticate";
import authorize from "../../middleware/authorize";
import { AdminController } from "./admin.controller";

const router = Router();

// Secure all admin routes
router.use(authenticate, authorize("ADMIN"));

router.get("/dashboard", AdminController.getDashboard);
router.get("/users", AdminController.getUsers);
router.get("/users/:userId", AdminController.getUserById);
router.patch("/users/:userId/block", AdminController.blockUser);
router.patch("/users/:userId/unblock", AdminController.unblockUser);

// Expert Approval Routes
router.get("/experts/pending", AdminController.getPendingExperts);
router.get("/experts/:expertId", AdminController.getExpertById);
router.patch("/experts/:expertId/approve", AdminController.approveExpert);
router.patch("/experts/:expertId/reject", AdminController.rejectExpert);

// Farms Monitoring Routes
router.get("/farms", AdminController.getAdminFarms);
router.get("/farms/:farmId", AdminController.getAdminFarmById);

// Marketplace Moderation Routes
router.get("/marketplace/products", AdminController.getAdminProducts);
router.get("/marketplace/products/:productId", AdminController.getAdminProductById);
router.patch("/marketplace/products/:productId/disable", AdminController.disableProduct);
router.patch("/marketplace/products/:productId/restore", AdminController.restoreProduct);
router.delete("/marketplace/products/:productId", AdminController.removeProduct);

// Consultations Monitoring Routes
router.get("/consultations", AdminController.getAdminConsultations);
router.get("/consultations/:consultationId", AdminController.getAdminConsultationById);

// Analytics Route
router.get("/analytics", AdminController.getAdminAnalytics);

// Profile Routes
router.get("/profile", AdminController.getAdminProfile);
router.patch("/profile", AdminController.updateAdminProfile);

export const AdminRoutes = router;