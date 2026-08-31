export type TConsultationStatus =
  | "PENDING"
  | "ACCEPTED"
  | "SCHEDULED"
  | "ONGOING"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED";

export type TConsultationUrgency = "LOW" | "MEDIUM" | "HIGH" | "EMERGENCY";

export interface IConsultationFarmer {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  location?: string;
  district?: string;
  farmName?: string;
  farmType?: string;
  farmSize?: string;
}

export interface IConsultationExpert {
  id?: string;
  name?: string;
  email?: string;
  title?: string;
  avatar?: string;
  phone?: string;
}

export interface IConsultationRecommendation {
  diagnosis: string;
  prescriptions?: string[];
  treatmentSteps?: string[];
  followUpDate?: string;
  additionalNotes?: string;
  createdAt?: string | Date;
}

export interface IConsultation {
  farmerId: string;
  farmerEmail: string;
  farmer: IConsultationFarmer;
  farmName?: string;
  district?: string;
  expertId?: string;
  expertEmail?: string;
  expert?: IConsultationExpert;
  cropType: string;
  problemTitle: string;
  problemDescription: string;
  images?: string[];
  status: TConsultationStatus;
  urgency: TConsultationUrgency;
  preferredDate?: string;
  preferredTime?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  meetingLink?: string;
  rejectionReason?: string;
  cancellationReason?: string;
  notes?: string;
  recommendations?: IConsultationRecommendation;
  createdAt?: Date;
  updatedAt?: Date;
}
