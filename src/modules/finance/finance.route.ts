import { Router, Request, Response } from "express";
import { createTransaction, getUserTransactions } from "./finance.controller.js";

const router = Router();
// POST API Endpoint
router.post("/transactions", createTransaction);
router.get("/transactions/:userId", getUserTransactions);

export default router;