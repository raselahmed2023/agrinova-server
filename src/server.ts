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
  chatGroq: [
    process.env.GROQ_API_KEY_1,
    process.env.GROQ_API_KEY_2,
  ].filter(Boolean).length,
  chatOpenRouter: [
    process.env.OPENROUTER_API_KEY_1,
    process.env.OPENROUTER_API_KEY_2,
  ].filter(Boolean).length,
  agentEggGroq: Boolean(process.env.GROQ_API_KEY_3),
  agentEggOpenRouter: Boolean(process.env.OPENROUTER_API_KEY_3),
  otherAiGroq: Boolean(process.env.GROQ_API_KEY_4),
  otherAiOpenRouter: Boolean(process.env.OPENROUTER_API_KEY_4),
  geminiImageKeys: [
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
  ].filter(Boolean).length,
});


startServer();