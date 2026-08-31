import mongoose, { Schema, model } from "mongoose";
import type {
  IExpertAvailability,
  IExpertDashboardData,
  IExpertProfile,
} from "./expert.interface";
import { Consultation } from "../consultation/consultation.model";

interface UserContext {
  id: string;
  email: string;
  name?: string;
  role: "FARMER" | "EXPERT" | "ADMIN";
}

// User schema corresponding to Better Auth's user collection in MongoDB
interface IUserDocument {
  _id: string | mongoose.Types.ObjectId;
  name: string;
  email: string;
  image?: string;
  avatar?: string;
  phone?: string;
  role?: string;
  status?: string;
  title?: string;
  specialization?: string | string[];
  bio?: string;
  experienceYears?: number;
  qualification?: string;
  institution?: string;
  rating?: number;
  ratingCount?: number;
  totalConsultations?: number;
  consultationFee?: number;
  languages?: string[];
  location?: string;
  isVerified?: boolean;
  availabilityStatus?: "AVAILABLE" | "BUSY" | "OFFLINE" | "PAUSED";
  isAcceptingConsultations?: boolean;
  timezone?: string;
  slotDurationMinutes?: number;
  weeklySchedule?: unknown[];
  customDatesOff?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

const userSchema = new Schema<IUserDocument>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    image: { type: String },
    avatar: { type: String },
    phone: { type: String },
    role: { type: String, default: "FARMER" },
    status: { type: String, default: "APPROVED" },
    title: { type: String },
    specialization: { type: Schema.Types.Mixed },
    bio: { type: String },
    experienceYears: { type: Number, default: 0 },
    qualification: { type: String },
    institution: { type: String },
    rating: { type: Number, default: 4.9 },
    ratingCount: { type: Number, default: 0 },
    totalConsultations: { type: Number, default: 0 },
    consultationFee: { type: Number, default: 500 },
    languages: { type: [String], default: ["Bengali", "English"] },
    location: { type: String },
    isVerified: { type: Boolean, default: true },
    availabilityStatus: { type: String, default: "AVAILABLE" },
    isAcceptingConsultations: { type: Boolean, default: true },
    timezone: { type: String, default: "Asia/Dhaka (GMT+6)" },
    slotDurationMinutes: { type: Number, default: 30 },
    weeklySchedule: { type: [Schema.Types.Mixed], default: [] },
    customDatesOff: { type: [String], default: [] },
  },
  {
    timestamps: true,
    strict: false,
    collection: "user",
  }
);

const UserModel =
  mongoose.models.User || model<IUserDocument>("User", userSchema);

const defaultWeeklySchedule = [
  {
    day: "monday",
    label: "Monday",
    isAvailable: true,
    slots: [
      { id: "s1", start: "09:00", end: "12:00" },
      { id: "s2", start: "15:00", end: "18:00" },
    ],
  },
  {
    day: "tuesday",
    label: "Tuesday",
    isAvailable: true,
    slots: [
      { id: "s3", start: "10:00", end: "13:00" },
      { id: "s4", start: "16:00", end: "19:00" },
    ],
  },
  {
    day: "wednesday",
    label: "Wednesday",
    isAvailable: true,
    slots: [
      { id: "s5", start: "09:00", end: "12:00" },
      { id: "s6", start: "14:00", end: "17:00" },
    ],
  },
  {
    day: "thursday",
    label: "Thursday",
    isAvailable: true,
    slots: [{ id: "s7", start: "10:00", end: "14:00" }],
  },
  {
    day: "friday",
    label: "Friday",
    isAvailable: false,
    slots: [],
  },
  {
    day: "saturday",
    label: "Saturday",
    isAvailable: true,
    slots: [{ id: "s8", start: "15:00", end: "20:00" }],
  },
  {
    day: "sunday",
    label: "Sunday",
    isAvailable: true,
    slots: [
      { id: "s9", start: "09:00", end: "12:00" },
      { id: "s10", start: "14:00", end: "18:00" },
    ],
  },
];

const getExpertDashboardFromDB = async (
  expertUser: UserContext
): Promise<IExpertDashboardData> => {
  const [
    newRequests,
    accepted,
    scheduled,
    ongoing,
    completed,
    recentRequests,
    upcomingConsultations,
    ongoingConsultations,
    userDoc,
  ] = await Promise.all([
    Consultation.countDocuments({ status: "PENDING" }),
    Consultation.countDocuments({ status: "ACCEPTED" }),
    Consultation.countDocuments({ status: "SCHEDULED" }),
    Consultation.countDocuments({ status: "ONGOING" }),
    Consultation.countDocuments({ status: "COMPLETED" }),
    Consultation.find({ status: "PENDING" }).sort({ createdAt: -1 }).limit(10),
    Consultation.find({ status: "SCHEDULED" }).sort({ scheduledDate: 1, createdAt: -1 }).limit(10),
    Consultation.find({ status: "ONGOING" }).sort({ updatedAt: -1 }).limit(5),
    UserModel.findOne({
      $or: [{ _id: expertUser.id }, { email: expertUser.email.toLowerCase().trim() }],
    }).catch(() => null),
  ]);

  const availabilityStatus =
    (userDoc?.availabilityStatus as "AVAILABLE" | "BUSY" | "OFFLINE" | "PAUSED") ||
    "AVAILABLE";

  return {
    newRequests,
    accepted,
    scheduled,
    ongoing,
    completed,
    recentRequests,
    upcomingConsultations,
    ongoingConsultations,
    availabilityStatus,
  };
};

const getExpertProfileFromDB = async (
  expertUser: UserContext
): Promise<IExpertProfile> => {
  const userDoc = await UserModel.findOne({
    $or: [{ _id: expertUser.id }, { email: expertUser.email.toLowerCase().trim() }],
  }).catch(() => null);

  if (userDoc) {
    const spec = Array.isArray(userDoc.specialization)
      ? userDoc.specialization
      : userDoc.specialization
      ? [userDoc.specialization]
      : [
          "Plant Pathology",
          "Crop Disease Management",
          "Soil Nutrition & Fertility",
        ];

    return {
      id: userDoc._id.toString(),
      _id: userDoc._id.toString(),
      name: userDoc.name || expertUser.name || "Specialist",
      email: userDoc.email,
      phone: userDoc.phone || "+880 1712-345678",
      avatar:
        userDoc.image ||
        userDoc.avatar ||
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
      title: userDoc.title || "Senior Agronomist & Plant Pathologist",
      specialization: spec,
      bio:
        userDoc.bio ||
        "Over 14 years of research and field advisory experience in cereal and horticulture crops across Bangladesh.",
      experienceYears: userDoc.experienceYears || 14,
      qualification:
        userDoc.qualification || "Ph.D. in Plant Pathology (BAU), M.Sc. in Agriculture",
      institution:
        userDoc.institution ||
        "Bangladesh Agricultural University (BAU) / AgriNova Advisory Board",
      rating: userDoc.rating || 4.9,
      ratingCount: userDoc.ratingCount || 128,
      totalConsultations: userDoc.totalConsultations || 342,
      consultationFee: userDoc.consultationFee || 500,
      languages: userDoc.languages || ["Bengali", "English"],
      location: userDoc.location || "Dhaka / Mymensingh, Bangladesh",
      isVerified: userDoc.isVerified !== false,
    };
  }

  return {
    id: expertUser.id,
    _id: expertUser.id,
    name: expertUser.name || "Dr. Rafiqul Islam",
    email: expertUser.email,
    phone: "+880 1712-345678",
    avatar:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
    title: "Senior Agronomist & Plant Pathologist",
    specialization: [
      "Plant Pathology",
      "Crop Disease Management",
      "Pest Control (IPM)",
      "Soil Nutrition & Fertility",
    ],
    bio: "Over 14 years of research and field advisory experience in cereal and horticulture crops across Bangladesh.",
    experienceYears: 14,
    qualification: "Ph.D. in Plant Pathology (BAU), M.Sc. in Agriculture",
    institution:
      "Bangladesh Agricultural University (BAU) / AgriNova Advisory Board",
    rating: 4.9,
    ratingCount: 128,
    totalConsultations: 342,
    consultationFee: 500,
    languages: ["Bengali", "English"],
    location: "Dhaka / Mymensingh, Bangladesh",
    isVerified: true,
  };
};

const updateExpertProfileInDB = async (
  expertUser: UserContext,
  payload: Partial<IExpertProfile>
): Promise<IExpertProfile> => {
  const filter = {
    $or: [{ _id: expertUser.id }, { email: expertUser.email.toLowerCase().trim() }],
  };

  const updateData: Record<string, unknown> = { ...payload };
  if (payload.avatar) {
    updateData.image = payload.avatar;
  }

  await UserModel.findOneAndUpdate(filter, { $set: updateData }, { upsert: true });
  return getExpertProfileFromDB(expertUser);
};

const getExpertAvailabilityFromDB = async (
  expertUser: UserContext
): Promise<IExpertAvailability> => {
  const userDoc = await UserModel.findOne({
    $or: [{ _id: expertUser.id }, { email: expertUser.email.toLowerCase().trim() }],
  }).catch(() => null);

  const schedule =
    userDoc?.weeklySchedule && Array.isArray(userDoc.weeklySchedule) && userDoc.weeklySchedule.length > 0
      ? userDoc.weeklySchedule
      : defaultWeeklySchedule;

  return {
    expertId: expertUser.id,
    isAcceptingConsultations: userDoc?.isAcceptingConsultations !== false,
    timezone: userDoc?.timezone || "Asia/Dhaka (GMT+6)",
    slotDurationMinutes: userDoc?.slotDurationMinutes || 30,
    weeklySchedule: schedule as IExpertAvailability["weeklySchedule"],
    customDatesOff: userDoc?.customDatesOff || ["2026-10-15", "2026-12-16"],
  };
};

const updateExpertAvailabilityInDB = async (
  expertUser: UserContext,
  payload: Partial<IExpertAvailability> & { availabilityStatus?: string }
): Promise<IExpertAvailability> => {
  const filter = {
    $or: [{ _id: expertUser.id }, { email: expertUser.email.toLowerCase().trim() }],
  };

  const updateData: Record<string, unknown> = { ...payload };
  if (payload.availabilityStatus) {
    updateData.availabilityStatus = payload.availabilityStatus;
  }

  await UserModel.findOneAndUpdate(filter, { $set: updateData }, { upsert: true });
  return getExpertAvailabilityFromDB(expertUser);
};

const getAllExpertsFromDB = async () => {
  const experts = await UserModel.find({
    role: "EXPERT",
    status: "APPROVED",
  }).limit(20);

  if (!experts || experts.length === 0) {
    return [
      {
        id: "exp-001",
        _id: "exp-001",
        name: "Dr. Rafiqul Islam",
        email: "dr.rafiqul@agrinova.io",
        title: "Senior Agronomist & Plant Pathologist",
        avatar:
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80",
        specialization: ["Plant Pathology", "Crop Protection", "Soil Management"],
        rating: 4.9,
        ratingCount: 128,
        experienceYears: 14,
        consultationFee: 500,
        isVerified: true,
      },
    ];
  }

  return experts;
};

export const ExpertServices = {
  getExpertDashboardFromDB,
  getExpertProfileFromDB,
  updateExpertProfileInDB,
  getExpertAvailabilityFromDB,
  updateExpertAvailabilityInDB,
  getAllExpertsFromDB,
};
