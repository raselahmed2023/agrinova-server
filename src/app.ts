import cors from "cors";
import express from "express";

import router from "./routes";

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL,
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

export default app;