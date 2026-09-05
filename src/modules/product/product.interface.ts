import {
  BY_PRODUCT_USES,
  POULTRY_TYPES,
  PRODUCT_CATEGORIES,
  PRODUCT_STATUSES,
  PRODUCTION_METHODS,
  TRANSACTION_TYPES,
} from "./product.constant";

export type TProductCategory =
  (typeof PRODUCT_CATEGORIES)[number];

export type TProductStatus =
  (typeof PRODUCT_STATUSES)[number];

export type TTransactionType =
  (typeof TRANSACTION_TYPES)[number];

export type TProductionMethod =
  (typeof PRODUCTION_METHODS)[number];

export type TPoultryType =
  (typeof POULTRY_TYPES)[number];

export type TByProductUse =
  (typeof BY_PRODUCT_USES)[number];

export interface IPoultryDetails {
  poultryType?: TPoultryType;
  breed?: string;
  ageWeeks?: number;
  averageWeightKg?: number;
}

export interface IProduct {
  title: string;
  description: string;
  price: number;
  category: TProductCategory;

  transactionType?: TTransactionType;
  productionMethod?: TProductionMethod;

  quantity: number;
  unit: string;

  images?: string[];

  sellerName?: string;
  sellerEmail?: string;
  sellerContact?: string;

  location?: string;
  division?: string;
  district?: string;
  upazila?: string;

  poultryDetails?: IPoultryDetails;

  byProductUses?: TByProductUse[];

  status?: TProductStatus;

  isFeatured?: boolean;
  isDeleted?: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export interface IProductQueryParams {
  search?: string;
  category?: string;
  status?: string;

  transactionType?: string;
  productionMethod?: string;

  location?: string;

  minPrice?: string;
  maxPrice?: string;

  sort?:
    | "newest"
    | "oldest"
    | "price_asc"
    | "price_desc"
    | "quantity_desc";

  sortBy?:
    | "createdAt"
    | "price"
    | "quantity"
    | "title";

  sortOrder?: "asc" | "desc";

  page?: string;
  limit?: string;
}

export interface IMyListingsQueryParams
  extends IProductQueryParams {}