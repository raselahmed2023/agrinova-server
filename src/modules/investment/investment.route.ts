import {
  Router,
} from "express";

import authenticate from "../../middleware/authenticate";
import authorize from "../../middleware/authorize";
import validateRequest from "../../middleware/validateRequest";

import {
  InvestmentController,
} from "./investment.controller";

import {
  InvestmentValidation,
} from "./investment.validation";

const router =
  Router();

/*
  FARMER
*/

router.post(
  "/",
  authenticate,
  authorize("FARMER"),
  validateRequest(
    InvestmentValidation
      .createInvestmentProjectSchema
  ),
  InvestmentController
    .createInvestmentProject
);

router.get(
  "/me",
  authenticate,
  authorize("FARMER"),
  InvestmentController
    .getMyInvestmentProjects
);

router.get(
  "/me/:projectId",
  authenticate,
  authorize("FARMER"),
  InvestmentController
    .getMyInvestmentProjectById
);

router.patch(
  "/me/:projectId",
  authenticate,
  authorize("FARMER"),
  validateRequest(
    InvestmentValidation
      .updateInvestmentProjectSchema
  ),
  InvestmentController
    .updateMyInvestmentProject
);

router.delete(
  "/me/:projectId",
  authenticate,
  authorize("FARMER"),
  InvestmentController
    .deleteMyInvestmentProject
);

/*
  ADMIN
*/

router.get(
  "/admin/projects",
  authenticate,
  authorize("ADMIN"),
  validateRequest(
    InvestmentValidation
      .getAdminInvestmentProjectsSchema
  ),
  InvestmentController
    .getAdminInvestmentProjects
);

router.get(
  "/admin/projects/:projectId",
  authenticate,
  authorize("ADMIN"),
  InvestmentController
    .getAdminInvestmentProjectById
);

router.patch(
  "/admin/projects/:projectId/review",
  authenticate,
  authorize("ADMIN"),
  validateRequest(
    InvestmentValidation
      .reviewInvestmentProjectSchema
  ),
  InvestmentController
    .reviewInvestmentProject
);

export default router;