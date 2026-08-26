import { Router } from "express";
import financeRouter from "../modules/finance/finance.route"; // আপনার ফাইন্যান্স রাউটারের সঠিক পাথ দিন

const router = Router();

// Health check endpoint
router.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "AgriNova API health check successful",
  });
});

// Finance routes
router.use("/finance", financeRouter);

export default router;