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

export const INVESTMENT_STATUSES = [
  "PENDING_REVIEW",
  "APPROVED",
  "REJECTED",
] as const;

export const FUNDING_STATUSES = [
  "OPEN",
  "FUNDED",
  "CLOSED",
] as const;

export const INVESTMENT_APPLICATION_STATUSES = [
  "PENDING_REVIEW",
  "APPROVED",
  "REJECTED",
] as const;

export const INVESTMENT_PAYMENT_METHODS = [
  "BANK_TRANSFER",
  "STRIPE",
] as const;

export const INVESTMENT_PAYMENT_STATUSES = [
  "NOT_STARTED",
  "AWAITING_PAYMENT",
  "PENDING_VERIFICATION",
  "PAID",
  "PAYMENT_REJECTED",
  "FAILED",
] as const;

export type TInvestmentCategory =
  (typeof INVESTMENT_CATEGORIES)[number];

export type TInvestmentStatus =
  (typeof INVESTMENT_STATUSES)[number];

export type TFundingStatus =
  (typeof FUNDING_STATUSES)[number];

export type TInvestmentApplicationStatus =
  (typeof INVESTMENT_APPLICATION_STATUSES)[number];

export type TInvestmentPaymentMethod =
  (typeof INVESTMENT_PAYMENT_METHODS)[number];

export type TInvestmentPaymentStatus =
  (typeof INVESTMENT_PAYMENT_STATUSES)[number];

/* ============================================================
   INVESTMENT PROJECT
============================================================ */

export interface IInvestmentProject {
  projectCode: string;

  farmerId: string;

  farmerName?: string;

  farmerEmail: string;

  /**
   * Legacy / optional farm relationship.
   *
   * New Farmer Care investment projects do not require
   * the farmer to select an existing Farm document.
   */
  farmId?: string;

  farmName?: string;

  projectName: string;

  category:
    TInvestmentCategory;

  /**
   * Total amount the farmer wants to raise.
   */
  requiredInvestment: number;

  /**
   * Minimum amount one investor may invest.
   */
  minimumInvestment: number;

  /**
   * Confirmed/paid investment amount.
   */
  fundedAmount: number;

  /**
   * Investment term.
   */
  durationMonths: number;

  /**
   * Projected ROI percentage for the full project term.
   *
   * Example:
   * 15 = projected 15% return over durationMonths.
   *
   * This is projected, not guaranteed.
   */
  expectedReturnPercent: number;

  division: string;

  district: string;

  upazila: string;

  address?: string;

  description: string;

  useOfFunds: string;

  projectImage?: string;

  supportingDocument?: string;

  status:
    TInvestmentStatus;

  fundingStatus:
    TFundingStatus;

  adminNote?: string;

  reviewedAt?: Date;

  approvedAt?: Date;

  isDeleted?: boolean;

  /* ==========================================================
     LEGACY FIELDS

     Retained only so old MongoDB documents stay readable.
     New project forms do NOT collect these.
  ========================================================== */

  ownContribution?: number;

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

/* ============================================================
   INVESTMENT APPLICATION
============================================================ */

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

  /**
   * Admin-only sensitive field.
   */
  nidNumber: string;

  amount: number;

  /**
   * Snapshot of the project return information when
   * the application was created.
   */
  expectedReturnPercent?: number;

  durationMonths?: number;

  note?: string;

  paymentMethod:
    TInvestmentPaymentMethod;

  status:
    TInvestmentApplicationStatus;

  adminNote?: string;

  reviewedAt?: Date;

  paymentStatus:
    TInvestmentPaymentStatus;

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

/* ============================================================
   QUERIES
============================================================ */

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