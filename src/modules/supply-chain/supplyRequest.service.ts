import {
  isValidObjectId,
} from "mongoose";

import AppError from "../../utils/AppError";

import {
  ISupplyRequest,
  TSupplyStatus,
} from "./supplyRequest.interface";

import {
  SupplyRequest,
} from "./supplyRequest.model";

const createSupplyRequestInDB =
  async (
    payload: Omit<
      ISupplyRequest,
      "status"
    >
  ) => {
    return SupplyRequest.create({
      ...payload,
      status: "SUBMITTED",
    });
  };

const getAllSupplyRequestsFromDB =
  async () => {
    return SupplyRequest.find()
      .sort({
        createdAt: -1,
      });
  };

const getSupplyRequestByIdFromDB =
  async (
    requestId: string
  ) => {
    if (
      !isValidObjectId(
        requestId
      )
    ) {
      throw new AppError(
        400,
        "Invalid supply request ID"
      );
    }

    const result =
      await SupplyRequest.findById(
        requestId
      );

    if (!result) {
      throw new AppError(
        404,
        "Supply request not found"
      );
    }

    return result;
  };

const updateSupplyRequestStatusInDB =
  async (
    requestId: string,
    status: TSupplyStatus
  ) => {
    if (
      !isValidObjectId(
        requestId
      )
    ) {
      throw new AppError(
        400,
        "Invalid supply request ID"
      );
    }

    const result =
      await SupplyRequest.findByIdAndUpdate(
        requestId,
        {
          status,
        },
        {
          new: true,
          runValidators: true,
        }
      );

    if (!result) {
      throw new AppError(
        404,
        "Supply request not found"
      );
    }

    return result;
  };

export const SupplyRequestService =
  {
    createSupplyRequestInDB,
    getAllSupplyRequestsFromDB,
    getSupplyRequestByIdFromDB,
    updateSupplyRequestStatusInDB,
  };