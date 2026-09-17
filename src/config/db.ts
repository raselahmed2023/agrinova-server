import dns from "node:dns";
import mongoose from "mongoose";

export const connectDB = async () => {
  const mongoUrl = process.env.MONGODB_URL;

  if (!mongoUrl) {
    throw new Error(
      "MONGODB_URL is not configured"
    );
  }


  mongoose.set(
    "bufferCommands",
    false
  );


  try {
    await mongoose.connect(
      mongoUrl,
      {
        serverSelectionTimeoutMS:
          15000,

        connectTimeoutMS:
          15000,

        socketTimeoutMS:
          45000,
      }
    );

    console.log(
      "MongoDB connected successfully"
    );

    return;
  } catch (firstError: any) {
    const code =
      firstError?.code ||
      firstError?.cause
        ?.code;

    console.warn(
      "Initial MongoDB connection failed:",
      code ||
        firstError?.name ||
        "Unknown error"
    );


    try {
      await mongoose.disconnect();
    } catch {

    }
  }


  console.warn(
    "Retrying MongoDB with public DNS + IPv6..."
  );

  dns.setServers([
    "1.1.1.1",
    "8.8.8.8",
  ]);

  try {
    dns.setDefaultResultOrder(
      "ipv6first"
    );
  } catch {
    // Older Node versions may not support ipv6first.
  }

  try {
    await mongoose.connect(
      mongoUrl,
      {
        /**
         * IMPORTANT FOR YOUR NETWORK
         */
        family: 6,

        serverSelectionTimeoutMS:
          20000,

        connectTimeoutMS:
          20000,

        socketTimeoutMS:
          45000,

        retryWrites: true,
      }
    );

    console.log(
      "MongoDB connected successfully using IPv6 fallback"
    );
  } catch (error: any) {
    console.error(
      "MongoDB connection failed after IPv6 fallback."
    );

    console.error({
      name:
        error?.name,

      code:
        error?.code,

      message:
        error?.message,
    });

    throw error;
  }
};