import { Types } from "mongoose";

export type TPurchaseRequestStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "PROCESSING"
  | "COMPLETED"
  | "CANCELLED";

export interface IPurchaseRequest {
  productId: Types.ObjectId;

  productTitle: string;
  productPrice: number;

  buyerId?: string;
  buyerName?: string;
  buyerEmail: string;

  sellerName?: string;
  sellerEmail: string;

  quantity: number;
  unit: string;

  deliveryLocation: string;
  note?: string;

  status: TPurchaseRequestStatus;

  createdAt?: Date;
  updatedAt?: Date;
}