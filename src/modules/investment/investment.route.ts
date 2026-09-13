import { Router } from "express";

import authenticate from "../../middleware/authenticate";
import authorize from "../../middleware/authorize";
import validateRequest from "../../middleware/validateRequest";
import { InvestmentController } from "./investment.controller";
import { InvestmentValidation } from "./investment.validation";

const router = Router();

// IMPORTANT: named/static routes must stay above /:projectId.
router.get(
  "/admin/projects",
  authenticate,
  authorize("ADMIN"),
  validateRequest(InvestmentValidation.getAdminInvestmentProjectsSchema),
  InvestmentController.getAdminInvestmentProjects
);
router.get(
  "/admin/projects/:projectId",
  authenticate,
  authorize("ADMIN"),
  InvestmentController.getAdminInvestmentProjectById
);
router.patch(
  "/admin/projects/:projectId/review",
  authenticate,
  authorize("ADMIN"),
  validateRequest(InvestmentValidation.reviewInvestmentProjectSchema),
  InvestmentController.reviewInvestmentProject
);
router.get(
  "/admin/applications",
  authenticate,
  authorize("ADMIN"),
  validateRequest(InvestmentValidation.getAdminInvestmentApplicationsSchema),
  InvestmentController.getAdminInvestmentApplications
);
router.patch(
  "/admin/applications/:applicationId/review",
  authenticate,
  authorize("ADMIN"),
  validateRequest(InvestmentValidation.reviewInvestmentApplicationSchema),
  InvestmentController.reviewInvestmentApplication
);
router.patch(
  "/admin/applications/:applicationId/payment-review",
  authenticate,
  authorize("ADMIN"),
  validateRequest(InvestmentValidation.reviewBankPaymentSchema),
  InvestmentController.reviewBankPayment
);

router.get("/me", authenticate, authorize("FARMER"), InvestmentController.getMyInvestmentProjects);
router.get("/me/:projectId", authenticate, authorize("FARMER"), InvestmentController.getMyInvestmentProjectById);
router.patch(
  "/me/:projectId",
  authenticate,
  authorize("FARMER"),
  validateRequest(InvestmentValidation.updateInvestmentProjectSchema),
  InvestmentController.updateMyInvestmentProject
);
router.delete("/me/:projectId", authenticate, authorize("FARMER"), InvestmentController.deleteMyInvestmentProject);

router.get("/my-investments", authenticate, authorize("FARMER"), InvestmentController.getMyInvestmentApplications);
router.get("/my-investments/:applicationId", authenticate, authorize("FARMER"), InvestmentController.getMyInvestmentApplication);
router.post(
  "/my-investments/:applicationId/bank-payment",
  authenticate,
  authorize("FARMER"),
  validateRequest(InvestmentValidation.submitBankPaymentSchema),
  InvestmentController.submitBankPayment
);
router.post(
  "/my-investments/:applicationId/stripe-checkout",
  authenticate,
  authorize("FARMER"),
  InvestmentController.createStripeCheckout
);
router.get(
  "/my-investments/:applicationId/stripe-verify",
  authenticate,
  authorize("FARMER"),
  InvestmentController.verifyStripeCheckout
);

router.post(
  "/:projectId/apply",
  authenticate,
  authorize("FARMER"),
  validateRequest(InvestmentValidation.createInvestmentApplicationSchema),
  InvestmentController.createInvestmentApplication
);

router.post(
  "/",
  authenticate,
  authorize("FARMER"),
  validateRequest(InvestmentValidation.createInvestmentProjectSchema),
  InvestmentController.createInvestmentProject
);

router.get("/", InvestmentController.getApprovedInvestmentProjects);
router.get("/:projectId", InvestmentController.getApprovedInvestmentProjectById);

export default router;