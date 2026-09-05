export const INVESTMENT_CATEGORIES = [
  "organic_farming",
  "poultry",
  "vegetable_farming",
  "greenhouse",
  "irrigation",
  "equipment",
  "technology",
  "other",
] as const;


export const INVESTMENT_STATUSES = [
  "PENDING_REVIEW",
  "APPROVED",
  "REJECTED",
] as const;


export type TInvestmentCategory =
  typeof INVESTMENT_CATEGORIES[number];


export type TInvestmentStatus =
  typeof INVESTMENT_STATUSES[number];


export interface IInvestmentProject {

  projectCode: string;


  farmerId: string;

  farmerName?: string;

  farmerEmail: string;



  projectName: string;

  category: TInvestmentCategory;



  requiredInvestment: number;

  ownContribution?: number;



  duration: string;



  expectedReturn: string;

  profitSharing: string;



  estimatedRevenue: number;

  estimatedCost: number;

  estimatedProfit: number;



  division: string;

  district: string;

  upazila: string;

  address: string;



  description: string;



  nidNumber: string;

  nidFrontImage?: string;



  status: TInvestmentStatus;



  adminNote?: string;

  reviewedAt?: Date;



  isDeleted?: boolean;


  createdAt?: Date;

  updatedAt?: Date;

}

export interface IInvestmentQuery {

  status?: string;

  search?: string;

  page?: string;

  limit?: string;

}