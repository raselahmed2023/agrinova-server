export const NOTIFICATION_TYPES = [
  "INVESTMENT_PROJECT_APPROVED",
  "INVESTMENT_PROJECT_REJECTED",
  "INVESTMENT_APPLICATION_APPROVED",
  "INVESTMENT_APPLICATION_REJECTED",
  "INVESTMENT_PAYMENT_SUBMITTED",
  "INVESTMENT_PAYMENT_CONFIRMED",
  "INVESTMENT_PAYMENT_REJECTED",
  "GENERAL",
] as const;

export type TNotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface INotification {
  userId: string;
  type: TNotificationType;
  title: string;
  message: string;
  href?: string;
  readAt?: Date;
  data?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}