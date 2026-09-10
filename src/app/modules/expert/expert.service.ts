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

const authDb = mongoose.connection.useDb("AgriNove-auth");
export const UserModel =
  authDb.models.User || authDb.model<IUserDocument>("User", userSchema, "user");

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
      : typeof userDoc.specialization === "string" && userDoc.specialization.trim()
      ? userDoc.specialization.split(",").map((s: string) => s.trim())
      : ["General Agriculture", "Crop Protection"];

    return {
      id: userDoc._id.toString(),
      _id: userDoc._id.toString(),
      name: userDoc.name || expertUser.name || "Specialist",
      email: userDoc.email,
      phone: userDoc.phone || "",
      avatar:
        userDoc.avatar ||
        userDoc.image ||
        "/images/default-avatar.png",
      title: userDoc.title || "Agricultural Expert",
      specialization: spec,
      bio: userDoc.bio || "",
      experienceYears:
        typeof userDoc.experienceYears === "number" ? userDoc.experienceYears : 0,
      qualification: userDoc.qualification || "",
      institution: userDoc.institution || "",
      rating: typeof userDoc.rating === "number" ? userDoc.rating : 5.0,
      ratingCount: typeof userDoc.ratingCount === "number" ? userDoc.ratingCount : 0,
      totalConsultations:
        typeof userDoc.totalConsultations === "number" ? userDoc.totalConsultations : 0,
      consultationFee:
        typeof userDoc.consultationFee === "number" ? userDoc.consultationFee : 500,
      languages:
        Array.isArray(userDoc.languages) && userDoc.languages.length > 0
          ? userDoc.languages
          : ["Bengali", "English"],
      location: userDoc.location || "",
      isVerified: userDoc.isVerified !== false,
    };
  }

  return {
    id: expertUser.id,
    _id: expertUser.id,
    name: expertUser.name || "Specialist",
    email: expertUser.email,
    phone: "",
    avatar: "/images/default-avatar.png",
    title: "Agricultural Expert",
    specialization: ["General Agriculture", "Crop Protection"],
    bio: "",
    experienceYears: 0,
    qualification: "",
    institution: "",
    rating: 5.0,
    ratingCount: 0,
    totalConsultations: 0,
    consultationFee: 500,
    languages: ["Bengali", "English"],
    location: "",
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

  if (payload.avatar !== undefined) {
    updateData.image = payload.avatar;
    updateData.avatar = payload.avatar;
  }
  if ((payload as any).image !== undefined) {
    updateData.image = (payload as any).image;
    updateData.avatar = (payload as any).image;
  }
  if ((payload as any).profileImage !== undefined) {
    updateData.image = (payload as any).profileImage;
    updateData.avatar = (payload as any).profileImage;
  }
  if (typeof payload.consultationFee === "number") {
    updateData.consultationFee = payload.consultationFee;
  }

  await UserModel.findOneAndUpdate(
    filter,
    { $set: updateData },
    { upsert: true, new: true }
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
  let dbExperts = [];
  try {
    dbExperts = await UserModel.find({
      role: "EXPERT",
      status: { $ne: "REJECTED" },
    }).sort({ createdAt: -1 });
  } catch (err) {
    console.error("Failed to query experts from DB:", err);
    dbExperts = [];
  }

  // Ensure DB experts have availability slots and necessary fields populated
  const mappedDb = dbExperts.map((exp: any) => {
    const obj = exp.toObject ? exp.toObject() : exp;
    const spec = Array.isArray(obj.specialization)
      ? obj.specialization
      : typeof obj.specialization === "string" && obj.specialization.trim()
      ? obj.specialization.split(",").map((s: string) => s.trim())
      : ["General Agriculture", "Crop Protection"];

    return {
      ...obj,
      _id: obj._id?.toString() || obj.id,
      id: obj._id?.toString() || obj.id,
      name: obj.name || "Registered Specialist",
      email: obj.email,
      phone: obj.phone || "",
      specialization: spec,
      availabilitySlots:
        obj.availabilitySlots && obj.availabilitySlots.length > 0
          ? obj.availabilitySlots
          : defaultAvailabilitySlots,
      avatar: obj.avatar || obj.image || "/images/default-avatar.png",
      image: obj.image || obj.avatar || "/images/default-avatar.png",
      institution: obj.institution || "AgriNova Specialist Network",
      consultationFee: typeof obj.consultationFee === "number" ? obj.consultationFee : 500,
      rating: typeof obj.rating === "number" ? obj.rating : 5.0,
      ratingCount: typeof obj.ratingCount === "number" ? obj.ratingCount : 0,
      experienceYears: typeof obj.experienceYears === "number" ? obj.experienceYears : 0,
      title: obj.title || "Agricultural Expert",
      bio: obj.bio || "",
      qualification: obj.qualification || "",
      location: obj.location || "",
      languages:
        Array.isArray(obj.languages) && obj.languages.length > 0
          ? obj.languages
          : ["Bengali", "English"],
      isVerified: obj.isVerified !== false,
      availabilityStatus: obj.availabilityStatus || "AVAILABLE",
    };
  });

  return mappedDb;
};

export const ExpertServices = {
  getExpertDashboardFromDB,
  getExpertProfileFromDB,
  updateExpertProfileInDB,
  getExpertAvailabilityFromDB,
  updateExpertAvailabilityInDB,
  getAllExpertsFromDB,
};
