import { Router, Request, Response } from "express";
import { createTransaction } from "./finance.controller.ts";

const router = Router();
// POST API Endpoint
router.post("/transactions", createTransaction);

export default router;