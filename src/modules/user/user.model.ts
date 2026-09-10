import { Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, select: false },
    phone: { type: String, default: "" },
    role: {
      type: String,
      enum: ["FARMER", "EXPERT", "ADMIN"],
      default: "FARMER",
    },
    status: {
      type: String,
      enum: ["ACTIVE", "BLOCKED", "PENDING", "APPROVED", "REJECTED"],
      default: "ACTIVE",
    },
    location: { type: String, default: "" },
    specialization: { type: String, default: "" },
    experienceYears: { type: Number, default: 0 },
    qualification: { type: String, default: "" },
  },
  { 
    timestamps: true,
    collection: "user" 
  }
);

export const User = model("User", userSchema);