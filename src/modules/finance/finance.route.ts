import { Router, Request, Response } from "express";
import { createTransaction, deleteTransaction, getUserTransactions } from "./finance.controller.js";

const router = Router();
// POST API Endpoint
router.post("/transactions", createTransaction);
router.get("/transactions/:userId", getUserTransactions);
router.delete("/transactions/:transactionId", deleteTransaction);

export default router;