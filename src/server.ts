
import "dotenv/config";
import app from "./app.js";
import { connectDB } from "./config/db.js";

const PORT = Number.parseInt(process.env.PORT ?? "5000", 10);

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error("Invalid PORT configuration");
}

async function startServer(): Promise<void> {
  try {
    await connectDB();

    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`AgriNova API running on port ${PORT}`);
    });

    server.on("error", () => {
      console.error("Server error");
      process.exit(1);
    });
  } catch {
    console.error("Backend startup failed");
    process.exit(1);
  }
}

void startServer();
