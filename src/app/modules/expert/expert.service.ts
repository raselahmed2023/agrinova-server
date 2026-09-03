import mongoose, { Schema, model } from "mongoose";
import AppError from "../../../utils/AppError";
import type {
  IAvailabilitySlot,
  IExpertAvailability,
  IExpertDashboardData,
  IExpertProfile,
  WeekDay,
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
  availabilityStatus?: "AVAILABLE" | "UNAVAILABLE";
  availabilitySlots?: IAvailabilitySlot[];
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
    availabilityStatus: {
      type: String,
      enum: ["AVAILABLE", "UNAVAILABLE"],
      default: "AVAILABLE",
    },
    availabilitySlots: {
      type: [
        {
          day: {
            type: String,
            enum: [
              "SATURDAY",
              "SUNDAY",
              "MONDAY",
              "TUESDAY",
              "WEDNESDAY",
              "THURSDAY",
              "FRIDAY",
            ],
            required: true,
          },
          enabled: { type: Boolean, default: false },
          startTime: { type: String },
          endTime: { type: String },
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
    strict: false,
    collection: "user",
  }
);

export const UserModel =
  mongoose.models.User || model<IUserDocument>("User", userSchema);

export const defaultAvailabilitySlots: IAvailabilitySlot[] = [
  { day: "SATURDAY", enabled: true, startTime: "18:00", endTime: "21:00" },
  { day: "SUNDAY", enabled: true, startTime: "18:00", endTime: "21:00" },
  { day: "MONDAY", enabled: false, startTime: "18:00", endTime: "21:00" },
  { day: "TUESDAY", enabled: true, startTime: "17:00", endTime: "20:00" },
  { day: "WEDNESDAY", enabled: false, startTime: "18:00", endTime: "21:00" },
  { day: "THURSDAY", enabled: false, startTime: "18:00", endTime: "21:00" },
  { day: "FRIDAY", enabled: false, startTime: "18:00", endTime: "21:00" },
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
    Consultation.find({ status: "PENDING" })
      .sort({ createdAt: -1 })
      .limit(10),
    Consultation.find({ status: "SCHEDULED" })
      .sort({ scheduledAt: 1, scheduledDate: 1, createdAt: -1 })
      .limit(10),
    Consultation.find({ status: "ONGOING" }).sort({ updatedAt: -1 }).limit(5),
    UserModel.findOne({
      $or: [
        { _id: expertUser.id },
        { email: expertUser.email.toLowerCase().trim() },
      ],
    }).catch(() => null),
  ]);

  const availabilityStatus =
    userDoc?.availabilityStatus === "UNAVAILABLE" ? "UNAVAILABLE" : "AVAILABLE";

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
    $or: [
      { _id: expertUser.id },
      { email: expertUser.email.toLowerCase().trim() },
    ],
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
        userDoc.qualification ||
        "Ph.D. in Plant Pathology (BAU), M.Sc. in Agriculture",
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
    $or: [
      { _id: expertUser.id },
      { email: expertUser.email.toLowerCase().trim() },
    ],
  };

  const updateData: Record<string, unknown> = { ...payload };
  delete updateData.email;
  delete updateData.role;
  delete updateData.status;
  delete updateData._id;
  delete updateData.id;

  if (payload.avatar) {
    updateData.image = payload.avatar;
  }
  if ((payload as any).profileImage) {
    updateData.image = (payload as any).profileImage;
    updateData.avatar = (payload as any).profileImage;
  }

  await UserModel.findOneAndUpdate(
    filter,
    { $set: updateData },
    { upsert: true }
  );
  return getExpertProfileFromDB(expertUser);
};

const getExpertAvailabilityFromDB = async (
  expertUser: UserContext
): Promise<IExpertAvailability> => {
  const userDoc = await UserModel.findOne({
    $or: [
      { _id: expertUser.id },
      { email: expertUser.email.toLowerCase().trim() },
    ],
  }).catch(() => null);

  const slots =
    userDoc?.availabilitySlots &&
    Array.isArray(userDoc.availabilitySlots) &&
    userDoc.availabilitySlots.length > 0
      ? userDoc.availabilitySlots
      : defaultAvailabilitySlots;

  return {
    expertId: expertUser.id,
    availabilityStatus: userDoc?.availabilityStatus === "UNAVAILABLE" ? "UNAVAILABLE" : "AVAILABLE",
    availabilitySlots: slots as IAvailabilitySlot[],
  };
};

const updateExpertAvailabilityInDB = async (
  expertUser: UserContext,
  payload: {
    availabilityStatus: "AVAILABLE" | "UNAVAILABLE";
    availabilitySlots: IAvailabilitySlot[];
  }
): Promise<IExpertAvailability> => {
  const { availabilityStatus, availabilitySlots } = payload;

  if (!["AVAILABLE", "UNAVAILABLE"].includes(availabilityStatus)) {
    throw new AppError(400, "Invalid availability status");
  }

  if (!Array.isArray(availabilitySlots)) {
    throw new AppError(400, "availabilitySlots must be an array");
  }

  // Validate duplicate weekdays
  const seenDays = new Set<WeekDay>();
  for (const slot of availabilitySlots) {
    if (seenDays.has(slot.day)) {
      throw new AppError(
        400,
        `Duplicate weekday '${slot.day}' is not allowed in availability slots.`
      );
    }
    seenDays.add(slot.day);

    if (slot.enabled) {
      if (!slot.startTime || !slot.endTime) {
        throw new AppError(
          400,
          `startTime and endTime are required for enabled day '${slot.day}'.`
        );
      }

      if (slot.startTime >= slot.endTime) {
        throw new AppError(
          400,
          `startTime (${slot.startTime}) must be earlier than endTime (${slot.endTime}) for '${slot.day}'.`
        );
      }
    }
  }

  const filter = {
    $or: [
      { _id: expertUser.id },
      { email: expertUser.email.toLowerCase().trim() },
    ],
  };

  await UserModel.findOneAndUpdate(
    filter,
    {
      $set: {
        availabilityStatus,
        availabilitySlots,
      },
    },
    { upsert: true }
  );

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
        specialization: [
          "Plant Pathology",
          "Crop Protection",
          "Soil Management",
        ],
        rating: 4.9,
        ratingCount: 128,
        experienceYears: 14,
        consultationFee: 500,
        isVerified: true,
        availabilityStatus: "AVAILABLE",
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
