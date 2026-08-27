import { Router, Request, Response } from "express";
import { createTransaction, deleteTransaction, getUserTransactions, updateTransaction } from "./finance.controller.js";

const router = Router();
// POST API Endpoint
router.post("/transactions", createTransaction);
router.get("/transactions/:userId", getUserTransactions);
router.delete("/transactions/:transactionId", deleteTransaction);
router.patch("/transactions/:transactionId", updateTransaction); // PATCH route

export default router;