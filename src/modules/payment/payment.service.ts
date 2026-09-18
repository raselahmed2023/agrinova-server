import Stripe from "stripe";
import { isValidObjectId } from "mongoose";

import AppError from "../../utils/AppError";
import { NotificationService } from "../notification/notification.service";
import { Order } from "../order/order.model";
import { Product } from "../product/product.model";

import { Consultation } from "../../app/modules/consultation/consultation.model";

import type {
  IStripeCheckoutCustomer,
  IStripeCheckoutResponse,
  IStripePaymentStatusResponse,
} from "./payment.interface";


const getStripeSecretKey = () => {
  const key =
    process.env.STRIPE_SECRET_KEY ||
    process.env.STRIPE_SECRET;

  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not configured"
    );
  }

  return key;
};


const getClientUrl = () => {
  const url =
    process.env.CLIENT_URL ||
    process.env.FRONTEND_URL;

  if (!url) {
    throw new Error(
      "CLIENT_URL is not configured"
    );
  }

  return url.replace(/\/$/, "");
};


const getStripe = () =>
  new Stripe(
    getStripeSecretKey()
  );


const toMinorUnit = (
  amount: number
) => {
  const value =
    Math.round(
      Number(amount) * 100
    );

  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    throw new AppError(
      400,
      "Invalid payment amount"
    );
  }

  return value;
};


// ======================================
// MARKETPLACE PAYMENT LOGIC
// ======================================

const notifySellersAfterPayment =
  async (
    order: any
  ) => {
    const notifications =
      (
        order.fulfillments ||
        []
      )
        .filter(
          (
            fulfillment: any
          ) =>
            fulfillment.sellerId
        )
        .map(
          (
            fulfillment: any
          ) => ({
            userId: String(
              fulfillment.sellerId
            ),

            type:
              "MARKETPLACE_NEW_ORDER" as const,

            title:
              "New paid marketplace order",

            message:
              `Payment is confirmed for order ${order.orderNumber}. Please prepare your items.`,

            href:
              "/seller-orders",

            data: {
              orderId:
                String(
                  order._id
                ),

              orderNumber:
                order.orderNumber,
            },
          })
        );

    if (
      notifications.length
    ) {
      await NotificationService
        .createManyNotifications(
          notifications
        );
    }
  };


/**
 * Card orders reserve stock when the
 * order is created.
 *
 * If checkout is explicitly cancelled
 * or expires, return that stock exactly once.
 */
const restoreOrderStock =
  async (
    orderId: string,
    paymentReference?: string
  ) => {
    if (
      !isValidObjectId(
        orderId
      )
    ) {
      throw new AppError(
        400,
        "Invalid order ID"
      );
    }

    const session =
      await Order.startSession();

    let result: any =
      null;

    try {
      await session
        .withTransaction(
          async () => {
            const order =
              await Order.findOne(
                {
                  _id:
                    orderId,

                  paymentMethod:
                    "card",

                  paymentStatus: {
                    $ne:
                      "paid",
                  },

                  stockRestored: {
                    $ne:
                      true,
                  },
                }
              ).session(
                session
              );

            if (!order) {
              result =
                await Order
                  .findById(
                    orderId
                  )
                  .session(
                    session
                  );

              return;
            }

            for (
              const item
              of order.items
            ) {
              const product =
                await Product
                  .findOneAndUpdate(
                    {
                      _id:
                        item.productId,

                      isDeleted: {
                        $ne:
                          true,
                      },
                    },

                    {
                      $inc: {
                        quantity:
                          item.quantity,
                      },
                    },

                    {
                      new:
                        true,

                      session,

                      runValidators:
                        true,
                    }
                  );

              if (
                product &&
                product.status ===
                  "out_of_stock" &&
                Number(
                  product.quantity
                ) > 0
              ) {
                product.status =
                  "available";

                await product.save(
                  {
                    session,
                  }
                );
              }
            }

            order.stockRestored =
              true;

            order.paymentStatus =
              "failed";

            order.status =
              "cancelled";

            if (
              paymentReference
            ) {
              order.paymentReference =
                paymentReference;
            }

            for (
              const fulfillment
              of order.fulfillments
            ) {
              if (
                fulfillment.status !==
                "delivered"
              ) {
                fulfillment.status =
                  "cancelled";
              }
            }

            await order.save(
              {
                session,
              }
            );

            result =
              order;
          }
        );
    } finally {
      await session
        .endSession();
    }

    return result;
  };


const createStripeCheckoutSession =
  async (
    customer:
      IStripeCheckoutCustomer,

    orderId:
      string
  ): Promise<IStripeCheckoutResponse> => {
    if (
      !isValidObjectId(
        orderId
      )
    ) {
      throw new AppError(
        400,
        "Invalid order ID"
      );
    }

    const order =
      await Order.findOne(
        {
          _id:
            orderId,

          customerId:
            customer.id,
        }
      );

    if (!order) {
      throw new AppError(
        404,
        "Order not found"
      );
    }

    if (
      order.paymentMethod !==
      "card"
    ) {
      throw new AppError(
        400,
        "This order is not configured for card payment"
      );
    }

    if (
      order.paymentStatus ===
      "paid"
    ) {
      throw new AppError(
        400,
        "This order has already been paid"
      );
    }

    if (
      order.stockRestored
    ) {
      throw new AppError(
        409,
        "This checkout reservation has expired. Please place the order again."
      );
    }

    if (
      Number(
        order.totalAmount
      ) <= 0
    ) {
      throw new AppError(
        400,
        "This order does not require a card payment"
      );
    }

    const lineItems:
      Stripe.Checkout.SessionCreateParams.LineItem[] =
      [];

    for (
      const item
      of order.items
    ) {
      if (
        Number(
          item.subtotal
        ) <= 0
      ) {
        continue;
      }

      lineItems.push(
        {
          quantity:
            item.quantity,

          price_data: {
            currency:
              "bdt",

            product_data: {
              name:
                item.title,

              description:
                `${item.quantity} ${item.unit}`,
            },

            unit_amount:
              toMinorUnit(
                item.price
              ),
          },
        }
      );
    }

    if (
      Number(
        order.deliveryFee
      ) > 0
    ) {
      lineItems.push(
        {
          quantity:
            1,

          price_data: {
            currency:
              "bdt",

            product_data: {
              name:
                "Delivery Fee",
            },

            unit_amount:
              toMinorUnit(
                order.deliveryFee
              ),
          },
        }
      );
    }

    if (
      !lineItems.length
    ) {
      throw new AppError(
        400,
        "No payable items found for this order"
      );
    }

    const stripe =
      getStripe();

    try {
      const checkoutSession =
        await stripe
          .checkout
          .sessions
          .create({
            mode:
              "payment",

            line_items:
              lineItems,

            customer_email:
              customer.email,

            client_reference_id:
              String(
                order._id
              ),

            metadata: {
              orderId:
                String(
                  order._id
                ),

              orderNumber:
                order.orderNumber,

              customerId:
                customer.id,

              paymentType:
                "marketplace_order",
            },

            success_url:
              `${getClientUrl()}/checkout/success?session_id={CHECKOUT_SESSION_ID}&orderId=${order._id}`,

            cancel_url:
              `${getClientUrl()}/checkout/cancel?orderId=${order._id}`,

            billing_address_collection:
              "auto",

            allow_promotion_codes:
              false,

            submit_type:
              "pay",
          });

      order.paymentReference =
        checkoutSession.id;

      await order.save();

      return {
        sessionId:
          checkoutSession.id,

        url:
          checkoutSession.url,
      };
    } catch (
      error
    ) {
      await restoreOrderStock(
        String(
          order._id
        )
      );

      throw error;
    }
  };


const getStripePaymentStatus =
  async (
    customerId:
      string,

    orderId:
      string
  ): Promise<IStripePaymentStatusResponse> => {
    if (
      !isValidObjectId(
        orderId
      )
    ) {
      throw new AppError(
        400,
        "Invalid order ID"
      );
    }

    const order =
      await Order.findOne(
        {
          _id:
            orderId,

          customerId,
        }
      ).lean();

    if (!order) {
      throw new AppError(
        404,
        "Order not found"
      );
    }

    return {
      orderId:
        String(
          order._id
        ),

      orderNumber:
        order.orderNumber,

      paymentStatus:
        order.paymentStatus,

      paymentReference:
        order.paymentReference,
    };
  };


const markOrderPaid =
  async (
    orderId:
      string,

    paymentReference:
      string
  ) => {
    if (
      !isValidObjectId(
        orderId
      )
    ) {
      throw new AppError(
        400,
        "Invalid order ID"
      );
    }

    const order =
      await Order.findById(
        orderId
      );

    if (!order) {
      throw new AppError(
        404,
        "Order not found"
      );
    }

    if (
      order.paymentStatus ===
      "paid"
    ) {
      return order;
    }

    if (
      order.stockRestored
    ) {
      throw new AppError(
        409,
        "Payment arrived after the inventory reservation expired. Manual review is required."
      );
    }

    order.paymentStatus =
      "paid";

    order.paymentReference =
      paymentReference;

    if (
      order.status ===
      "pending"
    ) {
      order.status =
        "confirmed";
    }

    for (
      const fulfillment
      of order.fulfillments
    ) {
      if (
        fulfillment.status ===
        "pending"
      ) {
        fulfillment.status =
          "confirmed";
      }
    }

    await order.save();

    await notifySellersAfterPayment(
      order
    );

    return order;
  };


const markOrderPaymentFailed =
  async (
    orderId:
      string,

    paymentReference?:
      string
  ) =>
    restoreOrderStock(
      orderId,
      paymentReference
    );


const verifyStripeCheckoutSession =
  async (
    customerId:
      string,

    sessionId:
      string
  ) => {
    const stripe =
      getStripe();

    const checkoutSession =
      await stripe
        .checkout
        .sessions
        .retrieve(
          sessionId
        );

    const orderId =
      checkoutSession
        .metadata
        ?.orderId;

    const sessionCustomerId =
      checkoutSession
        .metadata
        ?.customerId;

    if (
      !orderId ||
      sessionCustomerId !==
        customerId
    ) {
      throw new AppError(
        403,
        "This checkout session does not belong to you"
      );
    }

    if (
      checkoutSession
        .payment_status ===
      "paid"
    ) {
      await markOrderPaid(
        orderId,
        checkoutSession.id
      );
    }

    const order =
      await Order.findOne(
        {
          _id:
            orderId,

          customerId,
        }
      ).lean();

    if (!order) {
      throw new AppError(
        404,
        "Order not found"
      );
    }

    return {
      sessionId:
        checkoutSession.id,

      paymentStatus:
        checkoutSession
          .payment_status,

      status:
        checkoutSession
          .status,

      orderId:
        String(
          order._id
        ),

      orderNumber:
        order.orderNumber,

      orderPaymentStatus:
        order.paymentStatus,
    };
  };


const cancelPendingCardOrder =
  async (
    customerId:
      string,

    orderId:
      string
  ) => {
    if (
      !isValidObjectId(
        orderId
      )
    ) {
      throw new AppError(
        400,
        "Invalid order ID"
      );
    }

    const order =
      await Order.findOne(
        {
          _id:
            orderId,

          customerId,

          paymentMethod:
            "card",
        }
      );

    if (!order) {
      throw new AppError(
        404,
        "Order not found"
      );
    }

    if (
      order.paymentStatus ===
      "paid"
    ) {
      return order;
    }

    if (
      order.stockRestored
    ) {
      return order;
    }

    if (
      order.paymentReference
    ) {
      try {
        const stripe =
          getStripe();

        const checkoutSession =
          await stripe
            .checkout
            .sessions
            .retrieve(
              order.paymentReference
            );

        if (
          checkoutSession
            .status ===
          "open"
        ) {
          await stripe
            .checkout
            .sessions
            .expire(
              order.paymentReference
            );
        }
      } catch (
        error
      ) {
        console.warn(
          "Unable to expire Stripe session before cancellation:",
          error
        );
      }
    }

    return restoreOrderStock(
      String(
        order._id
      ),

      order.paymentReference
    );
  };


// ======================================
// EXPERT CONSULTATION STRIPE PAYMENT
// ======================================

const findOwnedConsultation =
  async (
    customerId:
      string,

    consultationId:
      string
  ) => {
    if (
      !isValidObjectId(
        consultationId
      )
    ) {
      throw new AppError(
        400,
        "Invalid consultation ID"
      );
    }

    const consultation =
      await Consultation.findOne(
        {
          _id:
            consultationId,

          $or: [
            {
              farmerId:
                customerId,
            },

            {
              "farmer.id":
                customerId,
            },
          ],
        }
      );

    if (
      !consultation
    ) {
      throw new AppError(
        404,
        "Consultation not found"
      );
    }

    return consultation;
  };


const createConsultationStripeCheckoutSession =
  async (
    customer:
      IStripeCheckoutCustomer,

    consultationId:
      string
  ): Promise<IStripeCheckoutResponse> => {
    const consultation =
      await findOwnedConsultation(
        customer.id,
        consultationId
      );

    if (
      consultation.paymentStatus ===
      "PAID"
    ) {
      throw new AppError(
        400,
        "This consultation has already been paid"
      );
    }

    if (
      consultation.status ===
      "CANCELLED"
    ) {
      throw new AppError(
        409,
        "This consultation has been cancelled. Please create a new booking."
      );
    }

    const fee =
      Number(
        consultation
          .consultationFee ||
          0
      );

    if (
      !Number.isFinite(
        fee
      ) ||
      fee <= 0
    ) {
      throw new AppError(
        400,
        "This consultation does not have a valid consultation fee"
      );
    }

    const stripe =
      getStripe();

    const checkoutSession =
      await stripe
        .checkout
        .sessions
        .create({
          mode:
            "payment",

          line_items: [
            {
              quantity:
                1,

              price_data: {
                currency:
                  "bdt",

                product_data: {
                  name:
                    `Expert Consultation — ${
                      consultation
                        .expertName ||
                      consultation
                        .expert
                        ?.name ||
                      "AgriNova Expert"
                    }`,

                  description:
                    `${consultation.cropType} consultation`,
                },

                unit_amount:
                  toMinorUnit(
                    fee
                  ),
              },
            },
          ],

          customer_email:
            customer.email,

          client_reference_id:
            String(
              consultation._id
            ),

          metadata: {
            consultationId:
              String(
                consultation._id
              ),

            customerId:
              customer.id,

            paymentType:
              "expert_consultation",
          },

          success_url:
            `${getClientUrl()}/consultant/payment/success?session_id={CHECKOUT_SESSION_ID}&consultationId=${consultation._id}`,

          cancel_url:
            `${getClientUrl()}/consultant/payment/cancel?consultationId=${consultation._id}`,

          billing_address_collection:
            "auto",

          allow_promotion_codes:
            false,

          submit_type:
            "pay",
        });

    consultation.paymentMethod =
      "STRIPE";

    consultation.paymentStatus =
      "UNPAID";

    consultation.stripeSessionId =
      checkoutSession.id;

    await consultation.save();

    return {
      sessionId:
        checkoutSession.id,

      url:
        checkoutSession.url,
    };
  };


const confirmConsultationPaid =
  async (
    consultationId:
      string,

    stripeSessionId:
      string,

    stripePaymentIntentId?:
      string
  ) => {
    if (
      !isValidObjectId(
        consultationId
      )
    ) {
      throw new AppError(
        400,
        "Invalid consultation ID"
      );
    }

    const consultation =
      await Consultation.findById(
        consultationId
      );

    if (
      !consultation
    ) {
      throw new AppError(
        404,
        "Consultation not found"
      );
    }

    /*
     * Idempotency:
     * webhook and success-page verification
     * can both call this function.
     */
    if (
      consultation.paymentStatus ===
      "PAID"
    ) {
      return consultation;
    }

    /*
     * If schedule values were only saved as
     * preferred date/time, promote them to
     * actual scheduled values after payment.
     */
    if (
      !consultation.scheduledDate &&
      consultation.preferredDate
    ) {
      consultation.scheduledDate =
        consultation.preferredDate;
    }

    if (
      !consultation.scheduledTime &&
      consultation.preferredTime
    ) {
      consultation.scheduledTime =
        consultation.preferredTime;
    }

    /*
     * Stable room ID prevents different
     * meeting links if webhook and success
     * verification arrive almost together.
     */
    const roomId =
      consultation.videoRoomId ||
      `agrinova-consultation-${String(
        consultation._id
      )}`;

    consultation.paymentMethod =
      "STRIPE";

    consultation.paymentStatus =
      "PAID";

    consultation.stripeSessionId =
      stripeSessionId;

    if (
      stripePaymentIntentId
    ) {
      consultation.stripePaymentIntentId =
        stripePaymentIntentId;
    }

    consultation.paidAt =
      new Date();

    if (
      consultation.scheduledDate &&
      consultation.scheduledTime
    ) {
      consultation.status =
        "SCHEDULED";

      consultation.videoRoomId =
        roomId;

      consultation.meetingLink =
        consultation.meetingLink ||
        `https://meet.jit.si/${roomId}`;
    } else {
      consultation.status =
        "PENDING";
    }

    consultation.cancellationReason =
      undefined;

    await consultation.save();

    return consultation;
  };


const markConsultationPaymentFailed =
  async (
    consultationId:
      string,

    stripeSessionId?:
      string
  ) => {
    if (
      !isValidObjectId(
        consultationId
      )
    ) {
      return null;
    }

    const consultation =
      await Consultation.findById(
        consultationId
      );

    if (
      !consultation
    ) {
      return null;
    }

    if (
      consultation.paymentStatus ===
      "PAID"
    ) {
      return consultation;
    }

    if (
      consultation.paymentStatus ===
      "CANCELLED"
    ) {
      return consultation;
    }

    consultation.paymentMethod =
      "STRIPE";

    consultation.paymentStatus =
      "FAILED";

    consultation.status =
      "CANCELLED";

    consultation.cancellationReason =
      "Consultation payment was not completed.";

    if (
      stripeSessionId
    ) {
      consultation.stripeSessionId =
        stripeSessionId;
    }

    await consultation.save();

    return consultation;
  };


const verifyConsultationStripeCheckoutSession =
  async (
    customerId:
      string,

    sessionId:
      string
  ) => {
    const stripe =
      getStripe();

    const checkoutSession =
      await stripe
        .checkout
        .sessions
        .retrieve(
          sessionId
        );

    const consultationId =
      checkoutSession
        .metadata
        ?.consultationId;

    const sessionCustomerId =
      checkoutSession
        .metadata
        ?.customerId;

    if (
      !consultationId ||
      sessionCustomerId !==
        customerId
    ) {
      throw new AppError(
        403,
        "This consultation checkout session does not belong to you"
      );
    }

    /*
     * Ensure consultation itself also
     * belongs to logged-in farmer.
     */
    await findOwnedConsultation(
      customerId,
      consultationId
    );

    let consultation;

    if (
      checkoutSession
        .payment_status ===
      "paid"
    ) {
      consultation =
        await confirmConsultationPaid(
          consultationId,

          checkoutSession.id,

          typeof checkoutSession
            .payment_intent ===
          "string"
            ? checkoutSession
                .payment_intent
            : undefined
        );
    } else {
      consultation =
        await Consultation.findById(
          consultationId
        );

      if (
        !consultation
      ) {
        throw new AppError(
          404,
          "Consultation not found"
        );
      }
    }

    return {
      sessionId:
        checkoutSession.id,

      paymentStatus:
        checkoutSession
          .payment_status,

      status:
        checkoutSession
          .status,

      consultation,
    };
  };


const cancelConsultationStripeCheckout =
  async (
    customerId:
      string,

    consultationId:
      string
  ) => {
    const consultation =
      await findOwnedConsultation(
        customerId,
        consultationId
      );

    if (
      consultation.paymentStatus ===
      "PAID"
    ) {
      return consultation;
    }

    if (
      consultation
        .stripeSessionId
    ) {
      try {
        const stripe =
          getStripe();

        const checkoutSession =
          await stripe
            .checkout
            .sessions
            .retrieve(
              consultation
                .stripeSessionId
            );

        /*
         * Very important:
         * farmer may reach cancel route
         * after Stripe already completed.
         *
         * Never cancel an actually-paid
         * consultation.
         */
        if (
          checkoutSession
            .payment_status ===
          "paid"
        ) {
          return confirmConsultationPaid(
            String(
              consultation._id
            ),

            checkoutSession.id,

            typeof checkoutSession
              .payment_intent ===
            "string"
              ? checkoutSession
                  .payment_intent
              : undefined
          );
        }

        if (
          checkoutSession
            .status ===
          "open"
        ) {
          await stripe
            .checkout
            .sessions
            .expire(
              consultation
                .stripeSessionId
            );
        }
      } catch (
        error
      ) {
        console.warn(
          "Unable to expire consultation Stripe session:",
          error
        );
      }
    }

    consultation.paymentMethod =
      "STRIPE";

    consultation.paymentStatus =
      "CANCELLED";

    consultation.status =
      "CANCELLED";

    consultation.cancellationReason =
      "Consultation payment was cancelled.";

    await consultation.save();

    return consultation;
  };


// ======================================
// EXPORT SERVICE
// ======================================

export const PaymentService = {
  // Marketplace
  createStripeCheckoutSession,

  getStripePaymentStatus,

  verifyStripeCheckoutSession,

  cancelPendingCardOrder,

  markOrderPaid,

  markOrderPaymentFailed,


  // Expert Consultation
  createConsultationStripeCheckoutSession,

  verifyConsultationStripeCheckoutSession,

  cancelConsultationStripeCheckout,

  confirmConsultationPaid,

  markConsultationPaymentFailed,
};