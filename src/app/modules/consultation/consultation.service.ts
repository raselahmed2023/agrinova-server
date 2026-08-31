import { isValidObjectId } from "mongoose";
import AppError from "../../../utils/AppError";
import type {
  IConsultation,
  TConsultationStatus,
  TConsultationUrgency,
} from "./consultation.interface";
import { Consultation } from "./consultation.model";

interface UserContext {
  id: string;
  email: string;
  name?: string;
  role: "FARMER" | "EXPERT" | "ADMIN";
}

interface CreateConsultationPayload {
  cropType: string;
  problemTitle: string;
  problemDescription: string;
  farmName?: string;
  district?: string;
  images?: string[];
  urgency?: TConsultationUrgency;
  preferredDate?: string;
  preferredTime?: string;
  notes?: string;
}

interface ScheduleConsultationPayload {
  scheduledDate: string;
  scheduledTime: string;
  meetingLink?: string;
  notes?: string;
}

interface RecommendationPayload {
  diagnosis: string;
  prescriptions?: string[];
  treatmentSteps?: string[];
  followUpDate?: string;
  additionalNotes?: string;
}

const createConsultationIntoDB = async (
  user: UserContext,
  payload: CreateConsultationPayload
) => {
  const consultationData: Partial<IConsultation> = {
    farmerId: user.id,
    farmerEmail: user.email.toLowerCase().trim(),
    farmer: {
      id: user.id,
      name: user.name || "AgriNova Farmer",
      email: user.email.toLowerCase().trim(),
      farmName: payload.farmName,
      district: payload.district,
      location: payload.district,
    },
    farmName: payload.farmName,
    district: payload.district,
    cropType: payload.cropType,
    problemTitle: payload.problemTitle,
    problemDescription: payload.problemDescription,
    images: payload.images || [],
    urgency: payload.urgency || "MEDIUM",
    preferredDate: payload.preferredDate,
    preferredTime: payload.preferredTime,
    notes: payload.notes,
    status: "PENDING",
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
  if (!isValidObjectId(id)) {
    // Also check if id string matches custom id
    const byCustomId = await Consultation.findOne({
      $or: [{ _id: id }, { id }],
    }).catch(() => null);
    if (byCustomId) return byCustomId;

    throw new AppError(400, "Invalid consultation ID");
  }

  const consultation = await Consultation.findById(id);
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
  consultation.expertEmail = expertUser.email.toLowerCase().trim();
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

  const generatedMeetingLink =
    payload.meetingLink ||
    `https://meet.agrinova.io/room/${consultation._id.toString()}`;

  consultation.status = "SCHEDULED";
  consultation.scheduledDate = payload.scheduledDate;
  consultation.scheduledTime = payload.scheduledTime;
  consultation.meetingLink = generatedMeetingLink;
  if (payload.notes) consultation.notes = payload.notes;

  if (!consultation.expertId) {
    consultation.expertId = expertUser.id;
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
  _expertUser: UserContext
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

  consultation.status = "COMPLETED";
  consultation.recommendations = {
    diagnosis: payload.diagnosis,
    prescriptions: payload.prescriptions || [],
    treatmentSteps: payload.treatmentSteps || [],
    followUpDate: payload.followUpDate,
    additionalNotes: payload.additionalNotes,
    createdAt: new Date(),
  };

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

export const ConsultationServices = {
  createConsultationIntoDB,
  getAllConsultationsFromDB,
  getExpertConsultationsFromDB,
  getSingleConsultationFromDB,
  acceptConsultationInDB,
  rejectConsultationInDB,
  scheduleConsultationInDB,
  updateConsultationStatusInDB,
  addRecommendationInDB,
  getExpertConsultationStatsFromDB,
};
