import {
  isValidObjectId,
} from "mongoose";

import AppError from "../../utils/AppError";

import {
  Product,
} from "../product/product.model";

import type {
  IPurchaseRequest,
  TPurchaseRequestStatus,
} from "./purchaseRequest.interface";

import {
  PurchaseRequest,
} from "./purchaseRequest.model";

interface CreateRequestPayload {
  productId: string;

  quantity: number;

  deliveryLocation: string;

  note?: string;
}

interface BuyerInfo {
  id?: string;

  name?: string;

  email: string;
}

const createPurchaseRequest =
  async (
    payload:
      CreateRequestPayload,

    buyer:
      BuyerInfo
  ) => {
    if (
      !isValidObjectId(
        payload.productId
      )
    ) {
      throw new AppError(
        400,
        "Invalid product ID"
      );
    }

    const product =
      await Product.findOne({
        _id:
          payload.productId,

        status:
          "available",

        isDeleted: {
          $ne: true,
        },
      });

    if (!product) {
      throw new AppError(
        404,
        "Product is not available"
      );
    }

    if (
      Number(
        product.quantity
      ) <= 0
    ) {
      throw new AppError(
        400,
        "This product is currently out of stock"
      );
    }

    if (
      payload.quantity >
      Number(
        product.quantity
      )
    ) {
      throw new AppError(
        400,
        `Only ${product.quantity} ${product.unit} is currently available`
      );
    }

    if (
      !product.sellerEmail
    ) {
      throw new AppError(
        400,
        "Seller information is missing"
      );
    }

    const buyerEmail =
      buyer.email
        .trim()
        .toLowerCase();

    const sellerEmail =
      product.sellerEmail
        .trim()
        .toLowerCase();

    if (
      buyerEmail ===
      sellerEmail
    ) {
      throw new AppError(
        400,
        "You cannot send a purchase request for your own product"
      );
    }

    const existingPendingRequest =
      await PurchaseRequest.findOne(
        {
          productId:
            product._id,

          buyerEmail,

          status:
            "PENDING",
        }
      );

    if (
      existingPendingRequest
    ) {
      throw new AppError(
        409,
        "You already have a pending request for this product"
      );
    }

    const productPrice =
      Number(
        product.price
      );

    const totalAmount =
      productPrice *
      payload.quantity;

    const requestData:
      IPurchaseRequest =
      {
        productId:
          product._id,

        productTitle:
          product.title,

        productPrice,

        buyerId:
          buyer.id,

        buyerName:
          buyer.name ||
          "AgriNova Buyer",

        buyerEmail,

        sellerName:
          product.sellerName ||
          "AgriNova Seller",

        sellerEmail,

        quantity:
          payload.quantity,

        unit:
          product.unit,

        totalAmount,

        deliveryLocation:
          payload.deliveryLocation,

        note:
          payload.note,

        status:
          "PENDING",
      };

    return PurchaseRequest.create(
      requestData
    );
  };

const getSentRequests =
  async (
    buyerEmail:
      string
  ) => {
    return PurchaseRequest.find(
      {
        buyerEmail:
          buyerEmail
            .trim()
            .toLowerCase(),
      }
    )
      .sort({
        createdAt: -1,
      })
      .populate(
        "productId",
        "title images status quantity unit transactionType"
      );
  };

const getReceivedRequests =
  async (
    sellerEmail:
      string
  ) => {
    return PurchaseRequest.find(
      {
        sellerEmail:
          sellerEmail
            .trim()
            .toLowerCase(),
      }
    )
      .sort({
        createdAt: -1,
      })
      .populate(
        "productId",
        "title images status quantity unit transactionType"
      );
  };

const getSingleRequest =
  async (
    requestId:
      string,

    userEmail:
      string
  ) => {
    if (
      !isValidObjectId(
        requestId
      )
    ) {
      throw new AppError(
        400,
        "Invalid request ID"
      );
    }

    const request =
      await PurchaseRequest.findById(
        requestId
      ).populate(
        "productId",
        "title images status quantity unit transactionType"
      );

    if (!request) {
      throw new AppError(
        404,
        "Purchase request not found"
      );
    }

    const normalizedEmail =
      userEmail
        .trim()
        .toLowerCase();

    if (
      request.buyerEmail !==
        normalizedEmail &&
      request.sellerEmail !==
        normalizedEmail
    ) {
      throw new AppError(
        403,
        "You are not allowed to view this request"
      );
    }

    return request;
  };

const updateRequestStatus =
  async (
    requestId:
      string,

    status:
      TPurchaseRequestStatus,

    userEmail:
      string
  ) => {
    if (
      !isValidObjectId(
        requestId
      )
    ) {
      throw new AppError(
        400,
        "Invalid request ID"
      );
    }

    const request =
      await PurchaseRequest.findById(
        requestId
      );

    if (!request) {
      throw new AppError(
        404,
        "Purchase request not found"
      );
    }

    const normalizedEmail =
      userEmail
        .trim()
        .toLowerCase();

    const isBuyer =
      request.buyerEmail ===
      normalizedEmail;

    const isSeller =
      request.sellerEmail ===
      normalizedEmail;

    if (
      !isBuyer &&
      !isSeller
    ) {
      throw new AppError(
        403,
        "You are not allowed to update this request"
      );
    }

    /*
      BUYER FLOW

      PENDING
        ↓
      CANCELLED
    */

    if (isBuyer) {
      if (
        request.status !==
          "PENDING" ||
        status !==
          "CANCELLED"
      ) {
        throw new AppError(
          400,
          "Buyer can only cancel a pending request"
        );
      }

      request.status =
        "CANCELLED";

      await request.save();

      return request;
    }

    /*
      SELLER FLOW

      PENDING
       ├── ACCEPTED
       └── REJECTED

      ACCEPTED
          ↓
      PROCESSING
          ↓
      COMPLETED
    */

    if (
      request.status ===
      "PENDING"
    ) {
      if (
        status ===
        "REJECTED"
      ) {
        request.status =
          "REJECTED";

        await request.save();

        return request;
      }

      if (
        status !==
        "ACCEPTED"
      ) {
        throw new AppError(
          400,
          "Pending request can only be accepted or rejected"
        );
      }

      /*
        IMPORTANT:
        Stock reservation is atomic.

        Multiple requests accepted
        simultaneously cannot oversell.
      */

      const updatedProduct =
        await Product.findOneAndUpdate(
          {
            _id:
              request.productId,

            sellerEmail:
              request.sellerEmail,

            status:
              "available",

            isDeleted: {
              $ne: true,
            },

            quantity: {
              $gte:
                request.quantity,
            },
          },

          {
            $inc: {
              quantity:
                -request.quantity,
            },
          },

          {
            new: true,

            runValidators:
              true,
          }
        );

      if (
        !updatedProduct
      ) {
        throw new AppError(
          409,
          "Requested quantity is no longer available"
        );
      }

      /*
        If last stock was taken,
        mark it out of stock.
      */

      if (
        Number(
          updatedProduct.quantity
        ) <= 0
      ) {
        await Product.updateOne(
          {
            _id:
              updatedProduct._id,

            quantity: {
              $lte: 0,
            },
          },

          {
            $set: {
              quantity: 0,

              status:
                "out_of_stock",
            },
          }
        );
      }

      request.status =
        "ACCEPTED";

      await request.save();

      return request;
    }

    if (
      request.status ===
      "ACCEPTED"
    ) {
      if (
        status !==
        "PROCESSING"
      ) {
        throw new AppError(
          400,
          "Accepted request can only move to processing"
        );
      }

      request.status =
        "PROCESSING";

      await request.save();

      return request;
    }

    if (
      request.status ===
      "PROCESSING"
    ) {
      if (
        status !==
        "COMPLETED"
      ) {
        throw new AppError(
          400,
          "Processing request can only be completed"
        );
      }

      request.status =
        "COMPLETED";

      await request.save();

      return request;
    }

    throw new AppError(
      400,
      "This purchase request is already closed"
    );
  };

export const PurchaseRequestService =
  {
    createPurchaseRequest,

    getSentRequests,

    getReceivedRequests,

    getSingleRequest,

    updateRequestStatus,
  };