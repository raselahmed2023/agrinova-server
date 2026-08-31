import {
  Router,
} from "express";

import {
  FarmControllers,
} from "./farm.controller";

import {
  FarmValidations,
} from "./farm.validation";

import validateRequest from "../../../middleware/validateRequest";

import authenticate from "../../../middleware/authenticate";

import authorize from "../../../middleware/authorize";

const router = Router();

router.use(
  authenticate,
  authorize("FARMER")
);

router.post(
  "/",
  validateRequest(
    FarmValidations.createFarmValidationSchema
  ),
  FarmControllers.createFarm
);

router.get(
  "/",
  FarmControllers.getAllFarms
);

router.get(
  "/:id",
  FarmControllers.getSingleFarm
);

router.patch(
  "/:id",
  validateRequest(
    FarmValidations.updateFarmValidationSchema
  ),
  FarmControllers.updateFarm
);

router.delete(
  "/:id",
  FarmControllers.deleteFarm
);

export const FarmRoutes =
  router;