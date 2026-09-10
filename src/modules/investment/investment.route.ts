import { Router } from "express";
import {
  createInvestmentProject,
  getMyInvestmentProjects,
} from "./investment.controller.js";
import authenticate from "../../middleware/authenticate.js";

const router = Router();

router.post(
  "/",
  authenticate,
  createInvestmentProject
);

router.get(
  "/me",
  authenticate,
  getMyInvestmentProjects
);

export default router;