export interface IStripeCheckoutCustomer {
  id: string;
  email: string;
  name?: string;
}

export interface ICreateStripeCheckoutPayload {
  orderId: string;
}

export interface IStripeCheckoutResponse {
  sessionId: string;
  url: string | null;
}

export interface IStripePaymentStatusResponse {
  orderId: string;
  orderNumber: string;
  paymentStatus: string;
  paymentReference?: string;
}