export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "partially_fulfilled",
  "ready_for_pickup",
  "picked_up",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;

export const PAYMENT_STATUSES = [
  "pending",
  "paid",
  "failed",
  "refunded",
] as const;

export const PAYMENT_METHODS = [
  "cod",
  "card",
] as const;

export const FULFILLMENT_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "ready_for_pickup",
  "picked_up",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;