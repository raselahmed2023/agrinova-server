import { isValidObjectId } from "mongoose";
import AppError from "../../../utils/AppError";
import type {
  IConsultation,
  TConsultationStatus,
  TConsultationUrgency,
} from "./consultation.interface";
import { Consultation } from "./consultation.model";
import {
  UserModel,
  defaultAvailabilitySlots,
} from "../expert/expert.service";
import type { WeekDay, IAvailabilitySlot } from "../expert/expert.interface";

const EARLY_JOIN_MINUTES = 15;
const CONSULTATION_DURATION_MINUTES = 30;
const LATE_JOIN_GRACE_MINUTES = 30;

interface UserContext {
  id: string;
  email: string;
  name?: string;
  role: "FARMER" | "EXPERT" | "ADMIN";
}

interface CreateConsultationPayload {
  cropType: string;
  cropName?: string;
  problemTitle: string;
  problemDescription: string;
  farmId?: string;
  farmName?: string;
  district?: string;
  images?: string[];
  urgency?: TConsultationUrgency;
  preferredDate?: string;
  preferredTime?: string;
  notes?: string;
}

interface ScheduleConsultationPayload {
  scheduledAt?: string | Date;
  scheduledDate?: string;
  scheduledTime?: string;
  meetingLink?: string;
  notes?: string;
}

interface RecommendationPayload {
  diagnosis?: string;
  recommendation?: string;
  prescriptions?: string[];
  treatmentSteps?: string[];
  followUpDate?: string;
  additionalNotes?: string;
}

const weekDayMap: WeekDay[] = [
  "SUNDAY",    // 0
  "MONDAY",    // 1
  "TUESDAY",   // 2
  "WEDNESDAY", // 3
  "THURSDAY",  // 4
  "FRIDAY",    // 5
  "SATURDAY",  // 6
];

const createConsultationIntoDB = async (
  user: UserContext,
  payload: CreateConsultationPayload
) => {
  const consultationData: Partial<IConsultation> = {
    farmerId: user.id,
    farmerName: user.name || "AgriNova Farmer",
    farmerEmail: user.email.toLowerCase().trim(),
    farmer: {
      id: user.id,
      name: user.name || "AgriNova Farmer",
      email: user.email.toLowerCase().trim(),
      farmName: payload.farmName,
      district: payload.district,
      location: payload.district,
    },
    farmId: payload.farmId,
    farmName: payload.farmName,
    district: payload.district,
    cropName: payload.cropName || payload.cropType,
    cropType: payload.cropType,
    problemTitle: payload.problemTitle,
    problemDescription: payload.problemDescription,
    images: payload.images || [],
    urgency: payload.urgency || "MEDIUM",
    preferredDate: payload.preferredDate,
    preferredTime: payload.preferredTime,
    notes: payload.notes,
    status: "PENDING",
    requestedAt: new Date(),
  };

  const result = await Consultation.create(consultationData);
  return result;
};

const getAllConsultationsFromDB = async (
  user: UserContext,
  queryParams: {
    status?: string;
    search?: string;
    cropType?: string;
    limit?: number;
    page?: number;
  }
) => {
  const filter: Record<string, unknown> = {};

  if (user.role === "FARMER") {
    filter.farmerId = user.id;
  }

  if (queryParams.status && queryParams.status !== "ALL") {
    filter.status = queryParams.status;
  }

  if (queryParams.cropType) {
    filter.cropType = new RegExp(queryParams.cropType, "i");
  }

  if (queryParams.search) {
    const searchRegex = new RegExp(queryParams.search, "i");
    filter.$or = [
      { problemTitle: searchRegex },
      { problemDescription: searchRegex },
      { cropType: searchRegex },
      { cropName: searchRegex },
      { farmerName: searchRegex },
      { "farmer.name": searchRegex },
      { farmName: searchRegex },
      { district: searchRegex },
    ];
  }

  const limit = queryParams.limit ? Number(queryParams.limit) : 50;
  const page = queryParams.page ? Number(queryParams.page) : 1;
  const skip = (page - 1) * limit;

  const result = await Consultation.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return result;
};

const getExpertConsultationsFromDB = async (
  _expertUser: UserContext,
  queryParams: {
    status?: string;
    search?: string;
    limit?: number;
    page?: number;
  }
) => {
  const filter: Record<string, unknown> = {};

  if (queryParams.status && queryParams.status !== "ALL") {
    filter.status = queryParams.status;
  }

  if (queryParams.search) {
    const searchRegex = new RegExp(queryParams.search, "i");
    filter.$or = [
      { problemTitle: searchRegex },
      { problemDescription: searchRegex },
      { cropType: searchRegex },
      { cropName: searchRegex },
      { farmerName: searchRegex },
      { "farmer.name": searchRegex },
      { farmName: searchRegex },
      { district: searchRegex },
    ];
  }

  const limit = queryParams.limit ? Number(queryParams.limit) : 50;
  const page = queryParams.page ? Number(queryParams.page) : 1;
  const skip = (page - 1) * limit;

  const result = await Consultation.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return result;
};

const getSingleConsultationFromDB = async (id: string, user: UserContext) => {
  let consultation = null;
  if (isValidObjectId(id)) {
    consultation = await Consultation.findById(id);
  } else {
    consultation = await Consultation.findOne({
      $or: [{ _id: id }, { id }],
    });
  }

  if (!consultation) {
    throw new AppError(404, "Consultation not found");
  }

  if (user.role === "FARMER" && consultation.farmerId !== user.id) {
    throw new AppError(403, "You are not authorized to view this consultation");
  }

  return consultation;
};

const acceptConsultationInDB = async (
  consultationId: string,
  expertUser: UserContext
) => {
  let consultation = null;
  if (isValidObjectId(consultationId)) {
    consultation = await Consultation.findById(consultationId);
  } else {
    consultation = await Consultation.findOne({
      $or: [{ _id: consultationId }, { id: consultationId }],
    });
  }

  if (!consultation) {
    throw new AppError(404, "Consultation request not found");
  }

  if (consultation.status !== "PENDING") {
    throw new AppError(
      400,
      `Cannot accept consultation with status '${consultation.status}'. Only PENDING requests can be accepted.`
    );
  }

  consultation.status = "ACCEPTED";
  consultation.expertId = expertUser.id;
  consultation.expertName = expertUser.name || "AgriNova Specialist";
  consultation.expertEmail = expertUser.email.toLowerCase().trim();
  consultation.acceptedAt = new Date();
  consultation.expert = {
    id: expertUser.id,
    name: expertUser.name || "AgriNova Specialist",
    email: expertUser.email.toLowerCase().trim(),
  };

  await consultation.save();
  return consultation;
};

const rejectConsultationInDB = async (
  consultationId: string,
  reason: string | undefined,
  expertUser: UserContext
) => {
  let consultation = null;
  if (isValidObjectId(consultationId)) {
    consultation = await Consultation.findById(consultationId);
  } else {
    consultation = await Consultation.findOne({
      $or: [{ _id: consultationId }, { id: consultationId }],
    });
  }

  if (!consultation) {
    throw new AppError(404, "Consultation request not found");
  }

  if (consultation.status !== "PENDING") {
    throw new AppError(
      400,
      `Cannot reject consultation with status '${consultation.status}'. Only PENDING requests can be rejected.`
    );
  }

  consultation.status = "REJECTED";
  consultation.rejectionReason =
    reason || "Unable to handle this consultation.";
  consultation.expertId = expertUser.id;
  consultation.expertName = expertUser.name || "AgriNova Specialist";
  consultation.expertEmail = expertUser.email.toLowerCase().trim();

  await consultation.save();
  return consultation;
};

const scheduleConsultationInDB = async (
  consultationId: string,
  payload: ScheduleConsultationPayload,
  expertUser: UserContext
) => {
  let consultation = null;
  if (isValidObjectId(consultationId)) {
    consultation = await Consultation.findById(consultationId);
  } else {
    consultation = await Consultation.findOne({
      $or: [{ _id: consultationId }, { id: consultationId }],
    });
  }

  if (!consultation) {
    throw new AppError(404, "Consultation not found");
  }

  // Check role & ownership
  if (
    consultation.expertId &&
    consultation.expertId !== expertUser.id &&
    expertUser.role !== "ADMIN"
  ) {
    throw new AppError(
      403,
      "You are not assigned to schedule this consultation."
    );
  }

  // Allowed statuses
  if (!["ACCEPTED", "SCHEDULED"].includes(consultation.status)) {
    throw new AppError(
      400,
      `Cannot schedule consultation with status '${consultation.status}'. Must be ACCEPTED or SCHEDULED.`
    );
  }

  // Determine target scheduledAt Date
  let scheduledAtDate: Date;
  if (payload.scheduledAt) {
    scheduledAtDate = new Date(payload.scheduledAt);
  } else if (payload.scheduledDate && payload.scheduledTime) {
    // parse date string e.g. "2026-09-05" and time "19:30"
    scheduledAtDate = new Date(
      `${payload.scheduledDate}T${payload.scheduledTime}:00`
    );
  } else {
    throw new AppError(
      400,
      "scheduledAt (or scheduledDate and scheduledTime) is required"
    );
  }

  if (isNaN(scheduledAtDate.getTime())) {
    throw new AppError(400, "Invalid scheduled date/time");
  }

  // Check scheduledAt is in the future
  if (scheduledAtDate.getTime() <= Date.now()) {
    throw new AppError(400, "Scheduled consultation time must be in the future.");
  }

  // Load expert's user profile to verify availability
  const expertDoc = await UserModel.findOne({
    $or: [
      { _id: expertUser.id },
      { email: expertUser.email.toLowerCase().trim() },
    ],
  });

  const availabilityStatus = expertDoc?.availabilityStatus || "AVAILABLE";
  if (availabilityStatus === "UNAVAILABLE") {
    throw new AppError(
      400,
      "Expert is currently marked as UNAVAILABLE. Cannot schedule consultations."
    );
  }

  const availabilitySlots =
    expertDoc?.availabilitySlots &&
    Array.isArray(expertDoc.availabilitySlots) &&
    expertDoc.availabilitySlots.length > 0
      ? expertDoc.availabilitySlots
      : defaultAvailabilitySlots;

  // Determine Weekday of requested time
  const targetDay = weekDayMap[scheduledAtDate.getDay()];
  const matchingSlot = (availabilitySlots as IAvailabilitySlot[]).find(
    (s: IAvailabilitySlot) => s.day === targetDay
  );

  if (!matchingSlot || !matchingSlot.enabled) {
    throw new AppError(
      400,
      `Expert is not available on ${targetDay}. Please choose an enabled day.`
    );
  }

  // Format time of scheduledAt to HH:mm
  const hours = String(scheduledAtDate.getHours()).padStart(2, "0");
  const minutes = String(scheduledAtDate.getMinutes()).padStart(2, "0");
  const scheduledTimeStr = `${hours}:${minutes}`;

  if (matchingSlot.startTime && matchingSlot.endTime) {
    if (
      scheduledTimeStr < matchingSlot.startTime ||
      scheduledTimeStr > matchingSlot.endTime
    ) {
      throw new AppError(
        400,
        `Selected time (${scheduledTimeStr}) is outside available hours for ${targetDay} (${matchingSlot.startTime} - ${matchingSlot.endTime}).`
      );
    }
  }

  // Collision Overlap Check (Duration = 30 minutes)
  const newStart = scheduledAtDate.getTime();
  const newEnd = newStart + CONSULTATION_DURATION_MINUTES * 60 * 1000;

  // Find all SCHEDULED or ONGOING consultations for this expert
  const existingActiveConsultations = await Consultation.find({
    expertId: expertUser.id,
    status: { $in: ["SCHEDULED", "ONGOING"] },
    _id: { $ne: consultation._id },
    scheduledAt: { $exists: true, $ne: null },
  });

  for (const existing of existingActiveConsultations) {
    if (existing.scheduledAt) {
      const existingStart = new Date(existing.scheduledAt).getTime();
      const existingEnd =
        existingStart + CONSULTATION_DURATION_MINUTES * 60 * 1000;

      // Overlap formula: newStart < existingEnd && newEnd > existingStart
      if (newStart < existingEnd && newEnd > existingStart) {
        throw new AppError(
          409,
          "Selected time overlaps with another consultation."
        );
      }
    }
  }

  // All checks passed! Update consultation
  const cleanId = (consultation._id || consultation.id || consultationId).toString();
  const videoRoomId = `agrinova-consultation-${cleanId}`;
  const generatedMeetingLink =
    payload.meetingLink || `https://meet.jit.si/${videoRoomId}`;

  consultation.status = "SCHEDULED";
  consultation.scheduledAt = scheduledAtDate;
  consultation.scheduledDate = scheduledAtDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  consultation.scheduledTime = scheduledTimeStr;
  consultation.videoRoomId = videoRoomId;
  consultation.meetingLink = generatedMeetingLink;

  if (payload.notes) {
    consultation.notes = payload.notes;
  }

  if (!consultation.expertId) {
    consultation.expertId = expertUser.id;
    consultation.expertName = expertUser.name || "AgriNova Specialist";
    consultation.expertEmail = expertUser.email;
    consultation.expert = {
      id: expertUser.id,
      name: expertUser.name || "AgriNova Specialist",
      email: expertUser.email,
    };
  }

  await consultation.save();
  return consultation;
};

const updateConsultationStatusInDB = async (
  consultationId: string,
  status: TConsultationStatus,
  reason?: string
) => {
  let consultation = null;
  if (isValidObjectId(consultationId)) {
    consultation = await Consultation.findById(consultationId);
  } else {
    consultation = await Consultation.findOne({
      $or: [{ _id: consultationId }, { id: consultationId }],
    });
  }

  if (!consultation) {
    throw new AppError(404, "Consultation not found");
  }

  consultation.status = status;
  if (status === "ONGOING" && !consultation.startedAt) {
    consultation.startedAt = new Date();
  }
  if (status === "COMPLETED" && !consultation.completedAt) {
    consultation.completedAt = new Date();
  }
  if (status === "CANCELLED" && reason) {
    consultation.cancellationReason = reason;
  }
  if (status === "REJECTED" && reason) {
    consultation.rejectionReason = reason;
  }

  await consultation.save();
  return consultation;
};

const addRecommendationInDB = async (
  consultationId: string,
  payload: RecommendationPayload,
  expertUser: UserContext
) => {
  let consultation = null;
  if (isValidObjectId(consultationId)) {
    consultation = await Consultation.findById(consultationId);
  } else {
    consultation = await Consultation.findOne({
      $or: [{ _id: consultationId }, { id: consultationId }],
    });
  }

  if (!consultation) {
    throw new AppError(404, "Consultation not found");
  }

  // Ownership Check
  if (
    consultation.expertId &&
    consultation.expertId !== expertUser.id &&
    expertUser.role !== "ADMIN"
  ) {
    throw new AppError(403, "You are not assigned to this consultation.");
  }

  // State Rule: ONGOING only
  if (consultation.status !== "ONGOING" && consultation.status !== "COMPLETED") {
    throw new AppError(
      409,
      `Cannot add recommendation to consultation with status '${consultation.status}'. Status must be ONGOING.`
    );
  }

  const recommendationText =
    payload.recommendation || payload.diagnosis || "Follow prescribed treatment";

  consultation.recommendation = recommendationText;
  consultation.recommendations = {
    diagnosis: payload.diagnosis || recommendationText,
    prescriptions: payload.prescriptions || [],
    treatmentSteps: payload.treatmentSteps || [],
    followUpDate: payload.followUpDate,
    additionalNotes: payload.additionalNotes,
    createdAt: new Date(),
  };

  await consultation.save();
  return consultation;
};

const completeConsultationInDB = async (
  consultationId: string,
  expertUser: UserContext
) => {
  let consultation = null;
  if (isValidObjectId(consultationId)) {
    consultation = await Consultation.findById(consultationId);
  } else {
    consultation = await Consultation.findOne({
      $or: [{ _id: consultationId }, { id: consultationId }],
    });
  }

  if (!consultation) {
    throw new AppError(404, "Consultation not found");
  }

  // Ownership Check
  if (
    consultation.expertId &&
    consultation.expertId !== expertUser.id &&
    expertUser.role !== "ADMIN"
  ) {
    throw new AppError(403, "You are not assigned to this consultation.");
  }

  // State Rule: Must be ONGOING
  if (consultation.status !== "ONGOING") {
    throw new AppError(
      409,
      `Cannot complete consultation with status '${consultation.status}'. Consultation must be in ONGOING status.`
    );
  }

  // Recommendation must exist
  if (!consultation.recommendation && !consultation.recommendations?.diagnosis) {
    throw new AppError(
      400,
      "Expert recommendation is required before completing consultation."
    );
  }

  consultation.status = "COMPLETED";
  consultation.completedAt = new Date();

  await consultation.save();
  return consultation;
};

const getExpertConsultationStatsFromDB = async (_expertUser: UserContext) => {
  const [newRequests, accepted, scheduled, ongoing, completed, cancelled] =
    await Promise.all([
      Consultation.countDocuments({ status: "PENDING" }),
      Consultation.countDocuments({ status: "ACCEPTED" }),
      Consultation.countDocuments({ status: "SCHEDULED" }),
      Consultation.countDocuments({ status: "ONGOING" }),
      Consultation.countDocuments({ status: "COMPLETED" }),
      Consultation.countDocuments({
        status: { $in: ["CANCELLED", "REJECTED"] },
      }),
    ]);

  const total =
    newRequests + accepted + scheduled + ongoing + completed + cancelled;

  return {
    newRequests,
    accepted,
    scheduled,
    ongoing,
    completed,
    cancelled,
    total,
  };
};

const startConsultationInDB = async (
  consultationId: string,
  expertUser: UserContext
) => {
  let consultation = null;
  if (isValidObjectId(consultationId)) {
    consultation = await Consultation.findById(consultationId);
  } else {
    consultation = await Consultation.findOne({
      $or: [{ _id: consultationId }, { id: consultationId }],
    });
  }

  if (!consultation) {
    throw new AppError(404, "Consultation not found");
  }

  if (
    consultation.expertId &&
    consultation.expertId !== expertUser.id &&
    expertUser.role !== "ADMIN"
  ) {
    throw new AppError(403, "You are not assigned to this consultation.");
  }

  if (!["SCHEDULED", "ONGOING"].includes(consultation.status)) {
    throw new AppError(
      409,
      `Cannot start consultation with status '${consultation.status}'. Status must be SCHEDULED.`
    );
  }

  const cleanId = (consultation._id || consultation.id || consultationId).toString();
  const videoRoomId = consultation.videoRoomId || `agrinova-consultation-${cleanId}`;
  const meetingLink = consultation.meetingLink || `https://meet.jit.si/${videoRoomId}`;

  // If already ongoing, return current meeting details directly
  if (consultation.status === "ONGOING") {
    return {
      status: consultation.status,
      videoRoomId,
      meetingLink,
    };
  }

  if (!consultation.scheduledAt) {
    throw new AppError(400, "Consultation has not been scheduled yet.");
  }

  const scheduledTime = new Date(consultation.scheduledAt).getTime();
  const now = Date.now();

  const earliestStart = scheduledTime - EARLY_JOIN_MINUTES * 60 * 1000;
  const latestStart =
    scheduledTime +
    (CONSULTATION_DURATION_MINUTES + LATE_JOIN_GRACE_MINUTES) * 60 * 1000;

  if (now < earliestStart) {
    const diffMinutes = Math.ceil((earliestStart - now) / (60 * 1000));
    throw new AppError(
      400,
      `Video call window is not open yet. You can start the call ${EARLY_JOIN_MINUTES} minutes before scheduled time (in ~${diffMinutes} minutes).`
    );
  }

  if (now > latestStart) {
    throw new AppError(
      400,
      "Consultation call window has expired. Please reschedule the consultation."
    );
  }

  consultation.status = "ONGOING";
  consultation.videoRoomId = videoRoomId;
  consultation.meetingLink = meetingLink;
  if (!consultation.startedAt) {
    consultation.startedAt = new Date();
  }

  await consultation.save();

  return {
    status: consultation.status,
    videoRoomId: consultation.videoRoomId,
    meetingLink: consultation.meetingLink,
  };
};

export const ConsultationServices = {
  createConsultationIntoDB,
  getAllConsultationsFromDB,
  getExpertConsultationsFromDB,
  getSingleConsultationFromDB,
  acceptConsultationInDB,
  rejectConsultationInDB,
  scheduleConsultationInDB,
  startConsultationInDB,
  addRecommendationInDB,
  completeConsultationInDB,
  updateConsultationStatusInDB,
  getExpertConsultationStatsFromDB,
};
