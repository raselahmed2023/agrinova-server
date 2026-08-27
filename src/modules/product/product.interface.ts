export type TProductCategory =
  | "seeds"
  | "fertilizers"
  | "pesticides"
  | "equipment"
  | "crops"
  | "livestock"
  | "other";

export type TProductStatus = "available" | "out_of_stock";

export interface IProduct {
  title: string;
  description: string;
  price: number;
  category: TProductCategory;
  quantity: number;
  unit: string;
  images?: string[];
  sellerName?: string;
  sellerEmail?: string;
  sellerContact?: string;
  location?: string;
  status: TProductStatus;
  isFeatured?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IProductQueryParams {
  search?: string;
  category?: string;
  status?: string;
  minPrice?: string;
  maxPrice?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: string;
  limit?: string;
}

export interface IMyListingsQueryParams extends IProductQueryParams {
  email?: string;
  sellerEmail?: string;
  sellerName?: string;
}
