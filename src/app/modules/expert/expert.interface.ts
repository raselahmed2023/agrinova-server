import type { IConsultation } from "../consultation/consultation.interface";

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

export interface IAvailabilitySlot {
  id: string;
  start: string;
  end: string;
}

export interface IWeeklyScheduleDay {
  day: string;
  label: string;
  isAvailable: boolean;
  slots: IAvailabilitySlot[];
}

export interface IExpertAvailability {
  expertId: string;
  isAcceptingConsultations: boolean;
  timezone: string;
  slotDurationMinutes: number;
  weeklySchedule: IWeeklyScheduleDay[];
  customDatesOff: string[];
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
  availabilityStatus: "AVAILABLE" | "BUSY" | "OFFLINE" | "PAUSED";
}
