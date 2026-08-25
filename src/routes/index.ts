import { Router } from "express";

import aiRouter from "../modules/ai/ai.route.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message:
      "AgriNova API health check successful",
  });
});

router.use("/ai", aiRouter);

export default router;