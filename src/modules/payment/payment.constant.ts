export const PAYMENT_PROVIDERS = [
    "stripe",
] as const;

export const PAYMENT_EVENTS = [
    "checkout.session.completed",
    "checkout.session.expired",
    "payment_intent.succeeded",
    "payment_intent.payment_failed",
] as const;