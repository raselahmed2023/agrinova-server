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
  expertId?: string;
  expertName?: string;
  expertEmail?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  meetingLink?: string;
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
  const expertId = payload.expertId;
  const expertEmail = payload.expertEmail ? payload.expertEmail.toLowerCase().trim() : undefined;

  // 1. Enforce: A farmer can schedule ONLY ONE active request to the same expert
  if (expertId || expertEmail) {
    const expertConditions: Record<string, unknown>[] = [];
    if (expertId) {
      expertConditions.push({ expertId }, { "expert.id": expertId });
    }
    if (expertEmail) {
      expertConditions.push({ expertEmail }, { "expert.email": expertEmail });
    }

    const existingActiveWithExpert = await Consultation.findOne({
      $and: [
        {
          $or: [
            { farmerId: user.id },
            { farmerEmail: user.email.toLowerCase().trim() },
            { "farmer.id": user.id },
            { "farmer.email": user.email.toLowerCase().trim() },
          ],
        },
        { $or: expertConditions },
        {
          status: { $in: ["PENDING", "ACCEPTED", "SCHEDULED", "ONGOING"] },
        },
      ],
    });

    if (existingActiveWithExpert) {
      throw new AppError(
        400,
        `You already have an active consultation (${existingActiveWithExpert.status.toLowerCase()}) with specialist ${
          existingActiveWithExpert.expertName || "this specialist"
        }. A farmer can schedule only one request to the same expert at a time.`
      );
    }
  }

  // 2. Enforce: No time conflict for farmer across ANY expert
  if (payload.scheduledDate && payload.scheduledTime) {
    const farmerTimeConflict = await Consultation.findOne({
      $and: [
        {
          $or: [
            { farmerId: user.id },
            { farmerEmail: user.email.toLowerCase().trim() },
            { "farmer.id": user.id },
            { "farmer.email": user.email.toLowerCase().trim() },
          ],
        },
        { scheduledDate: payload.scheduledDate },
        { scheduledTime: payload.scheduledTime },
        { status: { $in: ["ACCEPTED", "SCHEDULED", "ONGOING"] } },
      ],
    });

    if (farmerTimeConflict) {
      throw new AppError(
        400,
        `Time conflict: You already have another consultation booked on ${payload.scheduledDate} at ${payload.scheduledTime} with ${
          farmerTimeConflict.expertName || "another specialist"
        }. Please choose a different time slot.`
      );
    }

    // 3. Enforce: No time conflict for the expert with other farmers
    if (expertId || expertEmail) {
      const expertConditions: Record<string, unknown>[] = [];
      if (expertId) {
        expertConditions.push({ expertId }, { "expert.id": expertId });
      }
      if (expertEmail) {
        expertConditions.push({ expertEmail }, { "expert.email": expertEmail });
      }

      const expertTimeConflict = await Consultation.findOne({
        $and: [
          { $or: expertConditions },
          { scheduledDate: payload.scheduledDate },
          { scheduledTime: payload.scheduledTime },
          { status: { $in: ["ACCEPTED", "SCHEDULED", "ONGOING"] } },
        ],
      });

      if (expertTimeConflict) {
        throw new AppError(
          400,
          `Time slot unavailable: This specialist already has a consultation booked on ${payload.scheduledDate} at ${payload.scheduledTime}. Please choose another available time slot.`
        );
      }
    }
  }

  let expertDetails = undefined;
  if (payload.expertId) {
    try {
      const expertDoc = await UserModel.findById(payload.expertId).catch(() => null);
      if (expertDoc) {
        expertDetails = {
          id: expertDoc._id.toString(),
          name: expertDoc.name,
          email: expertDoc.email,
          title: expertDoc.title || "Agricultural Specialist",
          avatar: expertDoc.avatar || expertDoc.image,
          phone: expertDoc.phone,
        };
      }
    } catch {
      // Ignore lookup failure
    }
  }

  const cleanRandomRoom = `agrinova-consultation-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const hasSchedule = Boolean(payload.scheduledDate || payload.scheduledTime);

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
    expertId: payload.expertId,
    expertName: expertDetails?.name || payload.expertName,
    expertEmail: expertDetails?.email || payload.expertEmail,
    expert: expertDetails || (payload.expertId ? {
      id: payload.expertId,
      name: payload.expertName || "Agricultural Specialist",
      email: payload.expertEmail,
      title: "Agricultural Specialist",
    } : undefined),
    farmId: payload.farmId,
    farmName: payload.farmName,
    district: payload.district,
    cropName: payload.cropName || payload.cropType,
    cropType: payload.cropType,
    problemTitle: payload.problemTitle,
    problemDescription: payload.problemDescription,
    images: payload.images || [],
    urgency: payload.urgency || "MEDIUM",
    preferredDate: payload.preferredDate || payload.scheduledDate,
    preferredTime: payload.preferredTime || payload.scheduledTime,
    scheduledDate: payload.scheduledDate,
    scheduledTime: payload.scheduledTime,
    scheduledAt: payload.scheduledDate ? new Date(payload.scheduledDate) : undefined,
    status: hasSchedule ? "SCHEDULED" : "PENDING",
    videoRoomId: hasSchedule ? cleanRandomRoom : undefined,
    meetingLink: hasSchedule
      ? payload.meetingLink || `https://meet.jit.si/${cleanRandomRoom}`
      : undefined,
    notes: payload.notes,
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
  const conditions: Record<string, unknown>[] = [];

  if (user.role === "FARMER") {
    conditions.push({
      $or: [
        { farmerId: user.id },
        { farmerEmail: user.email.toLowerCase().trim() },
        { "farmer.id": user.id },
        { "farmer.email": user.email.toLowerCase().trim() },
      ],
    });
  }

  if (queryParams.status && queryParams.status !== "ALL") {
    conditions.push({ status: queryParams.status });
  }

  if (queryParams.cropType) {
    conditions.push({ cropType: new RegExp(queryParams.cropType, "i") });
  }

  if (queryParams.search) {
    const searchRegex = new RegExp(queryParams.search, "i");
    conditions.push({
      $or: [
        { problemTitle: searchRegex },
        { problemDescription: searchRegex },
        { cropType: searchRegex },
        { cropName: searchRegex },
        { farmerName: searchRegex },
        { "farmer.name": searchRegex },
        { farmName: searchRegex },
        { district: searchRegex },
      ],
    });
  }

  const filter = conditions.length > 0 ? { $and: conditions } : {};

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

const updateConsultationDetailsInDB = async (
  consultationId: string,
  payload: {
    cropType?: string;
    cropName?: string;
    problemTitle?: string;
    problemDescription?: string;
    urgency?: TConsultationUrgency;
    farmName?: string;
    district?: string;
    scheduledDate?: string;
    scheduledTime?: string;
    scheduledAt?: string | Date;
    meetingLink?: string;
    notes?: string;
  },
  user: UserContext
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

  // Authorization check: owner farmer, assigned expert, or admin
  const userRole = user.role?.toUpperCase();
  const isExpert = userRole === "EXPERT";
  const isAdmin = userRole === "ADMIN";
  const isOwnerFarmer =
    consultation.farmerId === user.id ||
    consultation.farmerEmail === user.email?.toLowerCase().trim() ||
    consultation.farmer?.email === user.email?.toLowerCase().trim();
  const isAssignedExpert =
    isExpert ||
    consultation.expertId === user.id ||
    consultation.expertEmail === user.email?.toLowerCase().trim() ||
    consultation.expert?.id === user.id ||
    consultation.expert?.email === user.email?.toLowerCase().trim();

  if (!isOwnerFarmer && !isAssignedExpert && !isAdmin && !isExpert) {
    throw new AppError(403, "You are not authorized to modify this consultation.");
  }

  if (payload.cropType) consultation.cropType = payload.cropType;
  if (payload.cropName) consultation.cropName = payload.cropName;
  if (payload.problemTitle) consultation.problemTitle = payload.problemTitle;
  if (payload.problemDescription) consultation.problemDescription = payload.problemDescription;
  if (payload.urgency) consultation.urgency = payload.urgency;
  if (payload.farmName) {
    consultation.farmName = payload.farmName;
    if (consultation.farmer) consultation.farmer.farmName = payload.farmName;
  }
  if (payload.district) {
    consultation.district = payload.district;
    if (consultation.farmer) consultation.farmer.district = payload.district;
  }
  if (payload.notes !== undefined) consultation.notes = payload.notes;

  // Handle rescheduling with time conflict prevention
  const newDate = payload.scheduledDate || (payload.scheduledAt ? new Date(payload.scheduledAt).toISOString().split("T")[0] : consultation.scheduledDate);
  const newTime = payload.scheduledTime || consultation.scheduledTime;
  const isRescheduling = Boolean(
    (payload.scheduledDate && payload.scheduledDate !== consultation.scheduledDate) ||
    (payload.scheduledTime && payload.scheduledTime !== consultation.scheduledTime) ||
    payload.scheduledAt
  );

  if (isRescheduling && newDate && newTime) {
    // 1. Farmer time conflict: Check if farmer already has another consultation at this slot
    const farmerConflict = await Consultation.findOne({
      _id: { $ne: consultation._id },
      $or: [
        { farmerId: user.id },
        { farmerEmail: user.email.toLowerCase().trim() },
        { "farmer.id": user.id },
        { "farmer.email": user.email.toLowerCase().trim() },
        ...(consultation.farmerId ? [{ farmerId: consultation.farmerId }] : []),
        ...(consultation.farmerEmail ? [{ farmerEmail: consultation.farmerEmail.toLowerCase().trim() }] : []),
      ],
      scheduledDate: newDate,
      scheduledTime: newTime,
      status: { $in: ["ACCEPTED", "SCHEDULED", "ONGOING"] },
    });

    if (farmerConflict) {
      throw new AppError(
        400,
        `Time conflict: You already have another consultation booked on ${newDate} at ${newTime} with specialist ${
          farmerConflict.expertName || "another expert"
        }. Please pick a different date or time slot.`
      );
    }

    // 2. Expert time conflict: Check if the expert is already booked at this slot
    const currentExpId = consultation.expertId || consultation.expert?.id;
    const currentExpEmail = consultation.expertEmail || consultation.expert?.email;
    if (currentExpId || currentExpEmail) {
      const expConditions: Record<string, unknown>[] = [];
      if (currentExpId) expConditions.push({ expertId: currentExpId }, { "expert.id": currentExpId });
      if (currentExpEmail) expConditions.push({ expertEmail: currentExpEmail.toLowerCase().trim() }, { "expert.email": currentExpEmail.toLowerCase().trim() });

      const expertConflict = await Consultation.findOne({
        _id: { $ne: consultation._id },
        $or: expConditions,
        scheduledDate: newDate,
        scheduledTime: newTime,
        status: { $in: ["ACCEPTED", "SCHEDULED", "ONGOING"] },
      });

      if (expertConflict) {
        throw new AppError(
          400,
          `Time slot unavailable: This specialist already has a consultation booked on ${newDate} at ${newTime}. Please select another available time slot.`
        );
      }
    }

    consultation.scheduledDate = newDate;
    consultation.scheduledTime = newTime;
    consultation.scheduledAt = new Date(`${newDate} ${newTime}`);
    if (isNaN(consultation.scheduledAt.getTime())) {
      consultation.scheduledAt = new Date(newDate);
    }
    if (consultation.status === "PENDING" || consultation.status === "COMPLETED") {
      consultation.status = "SCHEDULED";
    }
  }

  if (payload.meetingLink) {
    consultation.meetingLink = payload.meetingLink;
  }

  await consultation.save();
  return consultation;
};

const deleteConsultationFromDB = async (
  consultationId: string,
  user: UserContext
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

  // Prevent deleting completed consultations
  if (consultation.status === "COMPLETED") {
    throw new AppError(
      400,
      "Completed consultations cannot be deleted as they preserve historical diagnostic and prescription records."
    );
  }

  // Authorization: users with EXPERT role, ADMIN role, assigned expert, or owner farmer
  const userRole = user.role?.toUpperCase();
  const isExpert = userRole === "EXPERT";
  const isAdmin = userRole === "ADMIN";
  const isAssignedExpert =
    isExpert ||
    consultation.expertId === user.id ||
    consultation.expertEmail === user.email?.toLowerCase().trim() ||
    consultation.expert?.id === user.id ||
    consultation.expert?.email === user.email?.toLowerCase().trim();
  const isOwnerFarmer =
    consultation.farmerId === user.id ||
    consultation.farmerEmail === user.email?.toLowerCase().trim() ||
    consultation.farmer?.id === user.id ||
    consultation.farmer?.email === user.email?.toLowerCase().trim();

  if (!isExpert && !isAssignedExpert && !isAdmin && !isOwnerFarmer) {
    throw new AppError(403, "You are not authorized to delete this consultation.");
  }

  await Consultation.findByIdAndDelete(consultation._id);
  return { id: consultationId, message: "Consultation deleted successfully" };
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
  updateConsultationDetailsInDB,
  deleteConsultationFromDB,
};

