import {
  randomBytes,
} from "crypto";

import {
  isValidObjectId,
} from "mongoose";

import AppError from "../../utils/AppError";

import {
  NotificationService,
} from "../notification/notification.service";

import {
  ISupplyRequest,
  ISupplyRequestQuery,
  TSupplyStatus,
} from "./supplyRequest.interface";

import {
  SupplyRequest,
} from "./supplyRequest.model";

type TCreateSupplyRequestPayload =
  Omit<
    ISupplyRequest,
    | "trackingCode"
    | "status"
    | "adminNote"
    | "acceptedAt"
    | "rejectedAt"
    | "receivedAt"
    | "completedAt"
    | "createdAt"
    | "updatedAt"
  >;

interface IFarmerSupplyQuery {
  status?: string;

  page?: string;

  limit?: string;
}

const generateTrackingCode =
  async () => {
    for (
      let attempt = 0;
      attempt < 10;
      attempt++
    ) {
      const code =
        `AGN-${randomBytes(
          4
        )
          .toString(
            "hex"
          )
          .toUpperCase()}`;

      const exists =
        await SupplyRequest.exists(
          {
            trackingCode:
              code,
          }
        );

      if (
        !exists
      ) {
        return code;
      }
    }

    throw new AppError(
      500,
      "Could not generate tracking code"
    );
  };


const sendSupplyNotification =
  async ({
    userId,
    type,
    title,
    message,
    requestId,
    trackingCode,
    status,
  }: {
    userId: string;

    type:
      | "SUPPLY_REQUEST_SUBMITTED"
      | "SUPPLY_REQUEST_ACCEPTED"
      | "SUPPLY_REQUEST_REJECTED"
      | "SUPPLY_REQUEST_RECEIVED"
      | "SUPPLY_REQUEST_COMPLETED";

    title: string;

    message: string;

    requestId: string;

    trackingCode: string;

    status:
      TSupplyStatus;
  }) => {
    try {
      await NotificationService
        .createNotification(
          {
            userId,

            type,

            title,

            message,

            /**
             * User can click notification and
             * return to B2B Support.
             */
            href:
              "/support",

            data: {
              requestId,

              trackingCode,

              status,
            },
          }
        );
    } catch (
      error
    ) {
      console.error(
        "B2B notification creation failed:",
        error
      );
    }
  };



const createSupplyRequestInDB =
  async (
    payload:
      TCreateSupplyRequestPayload
  ) => {
    const trackingCode =
      await generateTrackingCode();

    const result =
      await SupplyRequest.create(
        {
          ...payload,

          trackingCode,

          status:
            "SUBMITTED",

          adminNote:
            "",
        }
      );

    await sendSupplyNotification(
      {
        userId:
          result.farmerId,

        type:
          "SUPPLY_REQUEST_SUBMITTED",

        title:
          "Product submitted to AgriNova",

        message:
          `Your ${result.productName} supply request was submitted successfully. Tracking ID: ${result.trackingCode}.`,

        requestId:
          String(
            result._id
          ),

        trackingCode:
          result.trackingCode,

        status:
          result.status,
      }
    );

    return result;
  };



const getAllSupplyRequestsFromDB =
  async (
    query:
      ISupplyRequestQuery
  ) => {
    const filter:
      Record<
        string,
        unknown
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
          farmerEmail: {
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
            createdAt:
              -1,
          })
          .skip(
            skip
          )
          .limit(
            limit
          )
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



const getMySupplyRequestsFromDB =
  async (
    farmerId:
      string,

    query:
      IFarmerSupplyQuery
  ) => {
    const filter:
      Record<
        string,
        unknown
      > = {
        farmerId,
      };

    if (
      query.status
    ) {
      filter.status =
        query.status;
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
            createdAt:
              -1,
          })
          .skip(
            skip
          )
          .limit(
            limit
          )
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
    requestId:
      string
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

    if (
      !result
    ) {
      throw new AppError(
        404,
        "Supply request not found"
      );
    }

    return result;
  };



const trackSupplyRequestFromDB =
  async (
    farmerId:
      string,

    trackingCode:
      string
  ) => {
    const normalizedTrackingCode =
      trackingCode
        .trim()
        .toUpperCase();

    const result =
      await SupplyRequest.findOne(
        {
          farmerId,

          trackingCode:
            normalizedTrackingCode,
        }
      )
        .select(
          "-phone"
        )
        .lean();

    if (
      !result
    ) {
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

    REJECTED:
      [],

    RECEIVED: [
      "COMPLETED",
    ],

    COMPLETED:
      [],
  };



const createStatusNotification =
  async (
    request:
      ISupplyRequest & {
        _id:
          unknown;
      }
  ) => {
    const requestId =
      String(
        request._id
      );

    const trackingCode =
      request.trackingCode;

    /**
     * ACCEPTED
     */
    if (
      request.status ===
      "ACCEPTED"
    ) {
      await sendSupplyNotification(
        {
          userId:
            request.farmerId,

          type:
            "SUPPLY_REQUEST_ACCEPTED",

          title:
            "Product request accepted",

          message:
            `AgriNova accepted your ${request.productName} request (${trackingCode}). You may now prepare the product for delivery to the selected AgriNova branch.`,

          requestId,

          trackingCode,

          status:
            request.status,
        }
      );

      return;
    }

    /**
     * REJECTED
     */
    if (
      request.status ===
      "REJECTED"
    ) {
      const reason =
        request.adminNote
          ?.trim();

      await sendSupplyNotification(
        {
          userId:
            request.farmerId,

          type:
            "SUPPLY_REQUEST_REJECTED",

          title:
            "Product request rejected",

          message:
            reason
              ? `Your ${request.productName} request (${trackingCode}) was rejected. Reason: ${reason}`
              : `Your ${request.productName} request (${trackingCode}) was rejected.`,

          requestId,

          trackingCode,

          status:
            request.status,
        }
      );

      return;
    }

    /**
     * RECEIVED
     */
    if (
      request.status ===
      "RECEIVED"
    ) {
      await sendSupplyNotification(
        {
          userId:
            request.farmerId,

          type:
            "SUPPLY_REQUEST_RECEIVED",

          title:
            "Product received by AgriNova",

          message:
            `AgriNova confirmed receipt of your ${request.productName} supply (${trackingCode}).`,

          requestId,

          trackingCode,

          status:
            request.status,
        }
      );

      return;
    }

    /**
     * COMPLETED
     */
    if (
      request.status ===
      "COMPLETED"
    ) {
      await sendSupplyNotification(
        {
          userId:
            request.farmerId,

          type:
            "SUPPLY_REQUEST_COMPLETED",

          title:
            "Supply request completed",

          message:
            `Your ${request.productName} supply request (${trackingCode}) has been completed successfully.`,

          requestId,

          trackingCode,

          status:
            request.status,
        }
      );
    }
  };



const updateSupplyRequestStatusInDB =
  async (
    requestId:
      string,

    status:
      TSupplyStatus,

    adminNote?:
      string
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

    if (
      !request
    ) {
      throw new AppError(
        404,
        "Supply request not found"
      );
    }

    if (
      request.status ===
      status
    ) {
      throw new AppError(
        400,
        `Supply request is already ${status}`
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

    if (
      status ===
        "REJECTED" &&
      !adminNote
        ?.trim()
    ) {
      throw new AppError(
        400,
        "A rejection reason is required"
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


    await createStatusNotification(
      request as unknown as
        ISupplyRequest & {
          _id:
            unknown;
        }
    );

    return request;
  };


export const SupplyRequestService =
  {
    createSupplyRequestInDB,

    getAllSupplyRequestsFromDB,

    getMySupplyRequestsFromDB,

    getSupplyRequestByIdFromDB,

    trackSupplyRequestFromDB,

    updateSupplyRequestStatusInDB,
  };