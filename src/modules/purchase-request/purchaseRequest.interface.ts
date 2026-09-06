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

  // Snapshot at the time the request is created
  productTitle: string;
  productPrice: number;

  buyerId?: string;
  buyerName?: string;
  buyerEmail: string;

  sellerName?: string;
  sellerEmail: string;

  quantity: number;
  unit: string;

  totalAmount: number;

  deliveryLocation: string;

  note?: string;

  status: TPurchaseRequestStatus;

  createdAt?: Date;
  updatedAt?: Date;
}