import { Router } from "express";

import authenticate from "../../middleware/authenticate.js";
import authorize from "../../middleware/authorize.js";

import {
  createTransaction,
  getUserTransactions,
  updateTransaction,
  deleteTransaction,
} from "./finance.controller.js";

const router = Router();


router.use(
  authenticate,
  authorize("FARMER")
);


router.post(
  "/transactions",
  createTransaction
);



router.get(
  "/transactions/me",
  getUserTransactions
);


router.patch(
  "/transactions/:transactionId",
  updateTransaction
);


router.delete(
  "/transactions/:transactionId",
  deleteTransaction
);

export default router;