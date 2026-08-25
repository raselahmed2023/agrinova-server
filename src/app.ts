import cors from "cors";
import express from "express";

import { globalErrorHandler } from "./middleware/globalErrorHandler.js";
import { notFound } from "./middleware/notFound.js";
import router from "./routes/index.js";

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

app.use(
  express.json({
    limit: "2mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
  })
);

app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "AgriNova API is running",
  });
});

app.use("/api/v1", router);

app.use(notFound);

app.use(globalErrorHandler);

export default app;