export interface ICreateStripeCheckoutSessionPayload {
    orderId: string;
}

export interface IStripeCheckoutSessionResponse {
    sessionId: string;
    checkoutUrl: string;
}

export interface IStripeWebhookResult {
    received: boolean;
    eventType?: string;
}