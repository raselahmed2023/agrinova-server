import { isValidObjectId } from "mongoose";

import AppError from "../../utils/AppError";
import { Product } from "../product/product.model";

import type {
  IPurchaseRequest,
  TPurchaseRequestStatus,
} from "./purchaseRequest.interface";

import { PurchaseRequest } from "./purchaseRequest.model";

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

const createPurchaseRequest = async (
  payload: CreateRequestPayload,
  buyer: BuyerInfo
) => {
  if (!isValidObjectId(payload.productId)) {
    throw new AppError(
      400,
      "Invalid product ID"
    );
  }

  const product = await Product.findById(
    payload.productId
  );

  if (!product) {
    throw new AppError(
      404,
      "Product not found"
    );
  }

  if (product.status !== "available") {
    throw new AppError(
      400,
      "This product is not currently available"
    );
  }

  if (
    payload.quantity >
    Number(product.quantity)
  ) {
    throw new AppError(
      400,
      `Only ${product.quantity} ${product.unit} is currently available`
    );
  }

  if (!product.sellerEmail) {
    throw new AppError(
      400,
      "Seller information is missing"
    );
  }

  const buyerEmail =
    buyer.email.trim().toLowerCase();

  const sellerEmail =
    product.sellerEmail
      .trim()
      .toLowerCase();

  if (buyerEmail === sellerEmail) {
    throw new AppError(
      400,
      "You cannot send a purchase request for your own product"
    );
  }

  const existingPendingRequest =
    await PurchaseRequest.findOne({
      productId: product._id,
      buyerEmail,
      status: "PENDING",
    });

  if (existingPendingRequest) {
    throw new AppError(
      409,
      "You already have a pending request for this product"
    );
  }

  const requestData: IPurchaseRequest = {
    productId: product._id,

    productTitle: product.title,
    productPrice: product.price,

    buyerId: buyer.id,
    buyerName:
      buyer.name || "AgriNova Buyer",
    buyerEmail,

    sellerName:
      product.sellerName ||
      "AgriNova Seller",

    sellerEmail,

    quantity: payload.quantity,
    unit: product.unit,

    deliveryLocation:
      payload.deliveryLocation,

    note: payload.note,

    status: "PENDING",
  };

  return PurchaseRequest.create(requestData);
};

const getSentRequests = async (
  buyerEmail: string
) => {
  return PurchaseRequest.find({
    buyerEmail:
      buyerEmail.trim().toLowerCase(),
  })
    .sort({ createdAt: -1 })
    .populate(
      "productId",
      "title images status quantity unit"
    );
};

const getReceivedRequests = async (
  sellerEmail: string
) => {
  return PurchaseRequest.find({
    sellerEmail:
      sellerEmail.trim().toLowerCase(),
  })
    .sort({ createdAt: -1 })
    .populate(
      "productId",
      "title images status quantity unit"
    );
};

const getSingleRequest = async (
  requestId: string,
  userEmail: string
) => {
  if (!isValidObjectId(requestId)) {
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
      "title images status quantity unit"
    );

  if (!request) {
    throw new AppError(
      404,
      "Purchase request not found"
    );
  }

  const normalizedEmail =
    userEmail.trim().toLowerCase();

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

const updateRequestStatus = async (
  requestId: string,
  status: TPurchaseRequestStatus,
  userEmail: string
) => {
  if (!isValidObjectId(requestId)) {
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
    userEmail.trim().toLowerCase();

  const isBuyer =
    request.buyerEmail ===
    normalizedEmail;

  const isSeller =
    request.sellerEmail ===
    normalizedEmail;

  if (!isBuyer && !isSeller) {
    throw new AppError(
      403,
      "You are not allowed to update this request"
    );
  }

  /*
    Buyer:
    PENDING -> CANCELLED

    Seller:
    PENDING -> ACCEPTED / REJECTED
    ACCEPTED -> PROCESSING
    PROCESSING -> COMPLETED
  */

  if (isBuyer) {
    if (
      request.status !== "PENDING" ||
      status !== "CANCELLED"
    ) {
      throw new AppError(
        400,
        "Buyer can only cancel a pending request"
      );
    }
  }

  if (isSeller) {
    if (
      request.status === "PENDING" &&
      ![
        "ACCEPTED",
        "REJECTED",
      ].includes(status)
    ) {
      throw new AppError(
        400,
        "Pending request can only be accepted or rejected"
      );
    }

    if (
      request.status === "ACCEPTED" &&
      status !== "PROCESSING"
    ) {
      throw new AppError(
        400,
        "Accepted request can only move to processing"
      );
    }

    if (
      request.status === "PROCESSING" &&
      status !== "COMPLETED"
    ) {
      throw new AppError(
        400,
        "Processing request can only be completed"
      );
    }

    if (
      [
        "REJECTED",
        "COMPLETED",
        "CANCELLED",
      ].includes(request.status)
    ) {
      throw new AppError(
        400,
        "This request is already closed"
      );
    }
  }

  /*
    When seller ACCEPTS:
    reserve quantity from marketplace stock.
  */

  if (
    isSeller &&
    request.status === "PENDING" &&
    status === "ACCEPTED"
  ) {
    const product =
      await Product.findById(
        request.productId
      );

    if (!product) {
      throw new AppError(
        404,
        "Product no longer exists"
      );
    }

    if (
      Number(product.quantity) <
      request.quantity
    ) {
      throw new AppError(
        400,
        "Requested quantity is no longer available"
      );
    }

    product.quantity =
      Number(product.quantity) -
      request.quantity;

    if (product.quantity <= 0) {
      product.quantity = 0;
      product.status =
        "out_of_stock";
    }

    await product.save();
  }

  request.status = status;

  await request.save();

  return request;
};

export const PurchaseRequestService = {
  createPurchaseRequest,
  getSentRequests,
  getReceivedRequests,
  getSingleRequest,
  updateRequestStatus,
};