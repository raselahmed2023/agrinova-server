import mongoose from "mongoose";

export const connectDB = async () => {
  const mongoUrl = process.env.MONGODB_URL;

  if (!mongoUrl) {
    throw new Error("MONGODB_URL is missing in .env file");
  }

  try {
    await mongoose.connect(mongoUrl, {
      dbName: "agrinova", // এখানে আপনার নির্দিষ্ট ডাটাবেজের নাম দিন (তাহলে আর 'test' DB-তে যাবে না)
    });

    console.log("🌱 MongoDB connected successfully to 'agrinova'");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};