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
  _id?: string;
  id?: string;

  farmerId: string;
  farmerName?: string;
  farmerEmail: string;
  farmer: IConsultationFarmer;

  expertId?: string;
  expertName?: string;
  expertEmail?: string;
  expert?: IConsultationExpert;

  farmId?: string;
  farmName?: string;

  district?: string;
  cropName?: string;
  cropType: string;

  problemTitle: string;
  problemDescription: string;
  images?: string[];

  status: TConsultationStatus;
  urgency: TConsultationUrgency;

  scheduledAt?: Date;
  recommendation?: string;
  videoRoomId?: string;

  preferredDate?: string;
  preferredTime?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  meetingLink?: string;

  rejectionReason?: string;
  cancellationReason?: string;
  notes?: string;
  recommendations?: IConsultationRecommendation;

  requestedAt?: Date;
  acceptedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;

  createdAt?: Date;
  updatedAt?: Date;
}
