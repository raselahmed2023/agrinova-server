import {
  FULFILLMENT_STATUSES,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
} from "./order.constant";

export type TOrderStatus =
  (typeof ORDER_STATUSES)[number];

export type TPaymentStatus =
  (typeof PAYMENT_STATUSES)[number];

export type TPaymentMethod =
  (typeof PAYMENT_METHODS)[number];

export type TFulfillmentStatus =
  (typeof FULFILLMENT_STATUSES)[number];

export interface IOrderItem {
  productId: string;

  title: string;

  image?: string;

  sellerId: string;

  sellerName: string;

  sellerEmail: string;

  quantity: number;

  unit: string;

  price: number;

  subtotal: number;
}

export interface IOrderFulfillment {
  sellerId: string;

  sellerName: string;

  sellerEmail: string;

  items: IOrderItem[];

  subtotal: number;

  commissionRate: number;

  commissionAmount: number;

  sellerPayout: number;

  status: TFulfillmentStatus;

  pickupAddress?: string;

  deliveryPartner?: {
    name?: string;
    phone?: string;
  };
}

export interface IShippingAddress {
  fullName: string;

  phone: string;

  address: string;

  division: string;

  district: string;

  upazila?: string;

  postalCode?: string;
}

export interface IOrder {
  orderNumber: string;

  customerId: string;

  customerName: string;

  customerEmail: string;

  items: IOrderItem[];

  fulfillments: IOrderFulfillment[];

  shippingAddress: IShippingAddress;

  subtotal: number;

  deliveryFee: number;

  commissionAmount: number;

  sellerPayoutAmount: number;

  totalAmount: number;

  status: TOrderStatus;

  paymentMethod: TPaymentMethod;

  paymentStatus: TPaymentStatus;

  paymentReference?: string;

  notes?: string;

  createdAt?: Date;

  updatedAt?: Date;
}