export const SUPPLY_CATEGORIES = [
  "vegetables",
  "fruits",
  "grains_cereals",
  "pulses_seeds",
  "spices",
  "agricultural_by_products",
  "other",
] as const;

export const SUPPLY_UNITS = [
  "kg",
  "maund",
  "ton",
  "bag",
  "box",
] as const;

export const AGRINOVA_BRANCHES = [
  "rajshahi",
  "bogura",
  "kushtia",
  "chattogram",
  "dhaka",
] as const;

export const SUPPLY_STATUSES = [
  "SUBMITTED",
  "ACCEPTED",
  "REJECTED",
  "RECEIVED",
  "COMPLETED",
] as const;

export type TSupplyCategory =
  (typeof SUPPLY_CATEGORIES)[number];

export type TSupplyUnit =
  (typeof SUPPLY_UNITS)[number];

export type TAgriNovaBranch =
  (typeof AGRINOVA_BRANCHES)[number];

export type TSupplyStatus =
  (typeof SUPPLY_STATUSES)[number];

export interface ISupplyRequest {
  trackingCode: string;

  farmerName: string;
  phone: string;
  farmerEmail?: string;

  productName: string;
  category: TSupplyCategory;

  quantity: number;
  unit: TSupplyUnit;
  expectedPrice: number;

  division: string;
  district: string;
  upazila: string;
  location: string;

  branch: TAgriNovaBranch;

  notes?: string;
  images?: string[];

  status: TSupplyStatus;

  adminNote?: string;

  acceptedAt?: Date;
  rejectedAt?: Date;
  receivedAt?: Date;
  completedAt?: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export interface ISupplyRequestQuery {
  status?: string;
  branch?: string;
  search?: string;
  page?: string;
  limit?: string;
}