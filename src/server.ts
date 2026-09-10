import "dotenv/config";

import app from "./app.js";
import { connectDB } from "./config/db.js";

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(
        `AgriNova server running on http://localhost:${PORT}`
      );
    });
  } catch (error) {
    console.error(
      "Failed to start server:",
      error
    );

    process.exit(1);
  }
};


console.log("AI ENV CHECK", {
  groq1: Boolean(process.env.GROQ_API_KEY_1),
  groq2: Boolean(process.env.GROQ_API_KEY_2),
  openrouter1: Boolean(
    process.env.OPENROUTER_API_KEY_1
  ),
  openrouter2: Boolean(
    process.env.OPENROUTER_API_KEY_2
  ),
});


startServer();