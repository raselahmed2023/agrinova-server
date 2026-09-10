import {
  randomBytes,
} from "crypto";

import {
  isValidObjectId,
} from "mongoose";

import AppError from "../../utils/AppError";

import {
  ISupplyRequest,
  ISupplyRequestQuery,
  TSupplyStatus,
} from "./supplyRequest.interface";

import {
  SupplyRequest,
} from "./supplyRequest.model";

const generateTrackingCode =
  async () => {
    for (
      let attempt = 0;
      attempt < 10;
      attempt++
    ) {
      const code =
        `AGN-${randomBytes(4)
          .toString("hex")
          .toUpperCase()}`;

      const exists =
        await SupplyRequest.exists({
          trackingCode:
            code,
        });

      if (!exists) {
        return code;
      }
    }

    throw new AppError(
      500,
      "Could not generate tracking code"
    );
  };

const createSupplyRequestInDB =
  async (
    payload: Omit<
      ISupplyRequest,
      | "trackingCode"
      | "status"
      | "adminNote"
      | "acceptedAt"
      | "rejectedAt"
      | "receivedAt"
      | "completedAt"
    >
  ) => {
    const trackingCode =
      await generateTrackingCode();

    return SupplyRequest.create({
      ...payload,

      trackingCode,

      status:
        "SUBMITTED",

      adminNote: "",
    });
  };

const getAllSupplyRequestsFromDB =
  async (
    query:
      ISupplyRequestQuery
  ) => {
    const filter:
      Record<
        string,
        any
      > = {};

    if (
      query.status
    ) {
      filter.status =
        query.status;
    }

    if (
      query.branch
    ) {
      filter.branch =
        query.branch;
    }

    if (
      query.search
        ?.trim()
    ) {
      const escaped =
        query.search
          .trim()
          .replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          );

      filter.$or = [
        {
          trackingCode: {
            $regex:
              escaped,
            $options:
              "i",
          },
        },

        {
          farmerName: {
            $regex:
              escaped,
            $options:
              "i",
          },
        },

        {
          phone: {
            $regex:
              escaped,
            $options:
              "i",
          },
        },

        {
          productName: {
            $regex:
              escaped,
            $options:
              "i",
          },
        },

        {
          district: {
            $regex:
              escaped,
            $options:
              "i",
          },
        },
      ];
    }

    const page =
      Math.max(
        Number(
          query.page
        ) || 1,
        1
      );

    const limit =
      Math.min(
        Math.max(
          Number(
            query.limit
          ) || 20,
          1
        ),
        50
      );

    const skip =
      (
        page - 1
      ) *
      limit;

    const [
      data,
      total,
    ] =
      await Promise.all([
        SupplyRequest.find(
          filter
        )
          .sort({
            createdAt: -1,
          })
          .skip(skip)
          .limit(limit)
          .lean(),

        SupplyRequest.countDocuments(
          filter
        ),
      ]);

    return {
      meta: {
        page,
        limit,
        total,

        totalPages:
          Math.max(
            Math.ceil(
              total /
                limit
            ),
            1
          ),
      },

      data,
    };
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

const trackSupplyRequestFromDB =
  async (
    trackingCode: string
  ) => {
    const result =
      await SupplyRequest.findOne({
        trackingCode:
          trackingCode
            .trim()
            .toUpperCase(),
      })
        .select(
          "-phone"
        )
        .lean();

    if (!result) {
      throw new AppError(
        404,
        "No supply request found with this tracking code"
      );
    }

    return result;
  };

const allowedTransitions:
  Record<
    TSupplyStatus,
    TSupplyStatus[]
  > = {
    SUBMITTED: [
      "ACCEPTED",
      "REJECTED",
    ],

    ACCEPTED: [
      "RECEIVED",
    ],

    REJECTED: [],

    RECEIVED: [
      "COMPLETED",
    ],

    COMPLETED: [],
  };

const updateSupplyRequestStatusInDB =
  async (
    requestId: string,

    status:
      TSupplyStatus,

    adminNote?: string
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

    const request =
      await SupplyRequest.findById(
        requestId
      );

    if (!request) {
      throw new AppError(
        404,
        "Supply request not found"
      );
    }

    const possibleNextStatuses =
      allowedTransitions[
        request.status
      ];

    if (
      !possibleNextStatuses.includes(
        status
      )
    ) {
      throw new AppError(
        400,
        `Cannot change supply request from ${request.status} to ${status}`
      );
    }

    request.status =
      status;

    if (
      adminNote !==
      undefined
    ) {
      request.adminNote =
        adminNote.trim();
    }

    const now =
      new Date();

    if (
      status ===
      "ACCEPTED"
    ) {
      request.acceptedAt =
        now;
    }

    if (
      status ===
      "REJECTED"
    ) {
      request.rejectedAt =
        now;
    }

    if (
      status ===
      "RECEIVED"
    ) {
      request.receivedAt =
        now;
    }

    if (
      status ===
      "COMPLETED"
    ) {
      request.completedAt =
        now;
    }

    await request.save();

    return request;
  };

export const SupplyRequestService =
  {
    createSupplyRequestInDB,
    getAllSupplyRequestsFromDB,
    getSupplyRequestByIdFromDB,
    trackSupplyRequestFromDB,
    updateSupplyRequestStatusInDB,
  };