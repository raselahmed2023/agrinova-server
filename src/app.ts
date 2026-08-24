import cors from "cors";
import express from "express";

import globalErrorHandler from "./middleware/globalErrorHandler";
import notFound from "./middleware/notFound";
import router from "./routes";

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);

app.use(express.json());

app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "AgriNova API is running",
  });
});

app.use("/api/v1", router);

// Global Error Handler
app.use(globalErrorHandler);

// Not Found Route
app.use(notFound);

export default app;