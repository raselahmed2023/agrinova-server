import { Schema, model } from "mongoose";
import type {
  IConsultation,
  TConsultationStatus,
  TConsultationUrgency,
} from "./consultation.interface";

const statuses: TConsultationStatus[] = [
  "PENDING",
  "ACCEPTED",
  "SCHEDULED",
  "ONGOING",
  "COMPLETED",
  "REJECTED",
  "CANCELLED",
];

const urgencies: TConsultationUrgency[] = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "EMERGENCY",
];

const consultationSchema = new Schema<IConsultation>(
  {
    farmerId: {
      type: String,
      required: true,
      index: true,
    },
    farmerName: {
      type: String,
      trim: true,
    },
    farmerEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    farmer: {
      id: { type: String },
      name: { type: String, required: true, trim: true },
      email: { type: String, trim: true, lowercase: true },
      phone: { type: String, trim: true },
      avatar: { type: String },
      location: { type: String },
      district: { type: String },
      farmName: { type: String },
      farmType: { type: String },
      farmSize: { type: String },
    },
    farmId: {
      type: String,
      trim: true,
    },
    farmName: {
      type: String,
      trim: true,
    },
    district: {
      type: String,
      trim: true,
    },
    expertId: {
      type: String,
      index: true,
    },
    expertName: {
      type: String,
      trim: true,
    },
    expertEmail: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
    },
    expert: {
      id: { type: String },
      name: { type: String, trim: true },
      email: { type: String, trim: true, lowercase: true },
      title: { type: String },
      avatar: { type: String },
      phone: { type: String },
    },
    cropName: {
      type: String,
      trim: true,
    },
    cropType: {
      type: String,
      required: true,
      trim: true,
    },
    problemTitle: {
      type: String,
      required: true,
      trim: true,
    },
    problemDescription: {
      type: String,
      required: true,
      trim: true,
    },
    images: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: statuses,
      default: "PENDING",
      index: true,
    },
    urgency: {
      type: String,
      enum: urgencies,
      default: "MEDIUM",
    },
    scheduledAt: {
      type: Date,
      index: true,
    },
    recommendation: {
      type: String,
      trim: true,
    },
    videoRoomId: {
      type: String,
      trim: true,
    },
    preferredDate: {
      type: String,
      trim: true,
    },
    preferredTime: {
      type: String,
      trim: true,
    },
    scheduledDate: {
      type: String,
      trim: true,
    },
    scheduledTime: {
      type: String,
      trim: true,
    },
    meetingLink: {
      type: String,
      trim: true,
    },
    rejectionReason: {
      type: String,
      trim: true,
    },
    cancellationReason: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    recommendations: {
      diagnosis: { type: String },
      prescriptions: { type: [String], default: [] },
      treatmentSteps: { type: [String], default: [] },
      followUpDate: { type: String },
      additionalNotes: { type: String },
      createdAt: { type: Date, default: Date.now },
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    acceptedAt: {
      type: Date,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

consultationSchema.index({ status: 1, createdAt: -1 });
consultationSchema.index({ farmerId: 1, createdAt: -1 });
consultationSchema.index({ expertId: 1, createdAt: -1 });
consultationSchema.index({ expertId: 1, scheduledAt: 1, status: 1 });

export const Consultation = model<IConsultation>(
  "Consultation",
  consultationSchema
);
