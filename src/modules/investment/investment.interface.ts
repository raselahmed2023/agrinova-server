export const INVESTMENT_CATEGORIES = [
  "organic_farming",
  "poultry",
  "vegetable_farming",
  "greenhouse",
  "irrigation",
  "equipment",
  "technology",
  "livestock",
  "fishery",
  "other",
] as const;

export const INVESTMENT_STATUSES = ["PENDING_REVIEW", "APPROVED", "REJECTED"] as const;
export const FUNDING_STATUSES = ["OPEN", "FUNDED", "CLOSED"] as const;
export const INVESTMENT_APPLICATION_STATUSES = ["PENDING_REVIEW", "APPROVED", "REJECTED"] as const;
export const INVESTMENT_PAYMENT_METHODS = ["BANK_TRANSFER", "STRIPE"] as const;
export const INVESTMENT_PAYMENT_STATUSES = [
  "NOT_STARTED",
  "AWAITING_PAYMENT",
  "PENDING_VERIFICATION",
  "PAID",
  "PAYMENT_REJECTED",
  "FAILED",
] as const;

export type TInvestmentCategory = (typeof INVESTMENT_CATEGORIES)[number];
export type TInvestmentStatus = (typeof INVESTMENT_STATUSES)[number];
export type TFundingStatus = (typeof FUNDING_STATUSES)[number];
export type TInvestmentApplicationStatus = (typeof INVESTMENT_APPLICATION_STATUSES)[number];
export type TInvestmentPaymentMethod = (typeof INVESTMENT_PAYMENT_METHODS)[number];
export type TInvestmentPaymentStatus = (typeof INVESTMENT_PAYMENT_STATUSES)[number];

export interface IInvestmentProject {
  projectCode: string;
  farmerId: string;
  farmerName?: string;
  farmerEmail: string;
  farmId: string;
  farmName?: string;
  projectName: string;
  category: TInvestmentCategory;
  requiredInvestment: number;
  minimumInvestment: number;
  fundedAmount: number;
  durationMonths: number;
  division: string;
  district: string;
  upazila: string;
  address?: string;
  description: string;
  useOfFunds: string;
  projectImage?: string;
  supportingDocument?: string;
  status: TInvestmentStatus;
  fundingStatus: TFundingStatus;
  adminNote?: string;
  reviewedAt?: Date;
  approvedAt?: Date;
  isDeleted?: boolean;

  // Legacy fields retained only so existing database records remain readable.
  ownContribution?: number;
  expectedReturnPercent?: number;
  investorSharePercent?: number;
  duration?: string;
  expectedReturn?: string;
  profitSharing?: string;
  estimatedRevenue?: number;
  estimatedCost?: number;
  estimatedProfit?: number;
  nidNumber?: string;
  nidFrontImage?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export interface IInvestmentApplication {
  applicationCode: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  projectOwnerId: string;
  projectOwnerName?: string;
  projectOwnerEmail: string;
  investorId: string;
  investorName?: string;
  investorEmail: string;
  amount: number;
  /** Sensitive identity field. Never expose outside ADMIN responses. */
  nidNumber: string;
  note?: string;
  paymentMethod: TInvestmentPaymentMethod;
  status: TInvestmentApplicationStatus;
  adminNote?: string;
  reviewedAt?: Date;
  paymentStatus: TInvestmentPaymentStatus;
  senderBankName?: string;
  transactionReference?: string;
  paymentProofUrl?: string;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  paymentAdminNote?: string;
  paymentReviewedAt?: Date;
  isDeleted?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IInvestmentQuery {
  status?: string;
  category?: string;
  search?: string;
  page?: string;
  limit?: string;
}

export interface IInvestmentApplicationQuery {
  status?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  search?: string;
  page?: string;
  limit?: string;
}
