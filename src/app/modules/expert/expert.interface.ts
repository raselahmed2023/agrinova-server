import type { IConsultation } from "../consultation/consultation.interface";

export type WeekDay =
  | "SATURDAY"
  | "SUNDAY"
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY";

export interface IAvailabilitySlot {
  day: WeekDay;
  enabled: boolean;
  startTime?: string; // "HH:mm" e.g., "18:00"
  endTime?: string;   // "HH:mm" e.g., "21:00"
}

export interface IExpert {
  id: string;
  name: string;
  email: string;
  phone?: string;
  profileImage?: string;
  avatar?: string;
  title?: string;
  specialization?: string | string[];
  qualification?: string;
  experienceYears?: number;
  institution?: string;
  bio?: string;
  rating?: number;
  ratingCount?: number;
  totalConsultations?: number;
  consultationFee?: number;
  languages?: string[];
  location?: string;
  isVerified?: boolean;
  availabilityStatus: "AVAILABLE" | "UNAVAILABLE";
  availabilitySlots?: IAvailabilitySlot[];
}

export interface IExpertProfile {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  title?: string;
  specialization?: string[] | string;
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
}

export interface IExpertAvailability {
  expertId?: string;
  availabilityStatus: "AVAILABLE" | "UNAVAILABLE";
  availabilitySlots: IAvailabilitySlot[];
}

export interface IExpertDashboardData {
  newRequests: number;
  accepted: number;
  scheduled: number;
  ongoing: number;
  completed: number;
  recentRequests: IConsultation[];
  upcomingConsultations: IConsultation[];
  ongoingConsultations: IConsultation[];
  availabilityStatus: "AVAILABLE" | "UNAVAILABLE";
}
