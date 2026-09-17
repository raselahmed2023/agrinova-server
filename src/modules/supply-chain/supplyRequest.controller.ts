import {
  Request,
  Response,
} from "express";

import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";

import {
  SupplyRequestService,
} from "./supplyRequest.service";


const getParam =
  (
    value:
      string |
      string[]
  ): string => {
    if (
      Array.isArray(
        value
      )
    ) {
      return (
        value[0] ||
        ""
      );
    }

    return value;
  };



const requireUser =
  (
    req:
      Request,

    res:
      Response
  ) => {
    if (
      !req.user
    ) {
      res
        .status(
          401
        )
        .json({
          success:
            false,

          message:
            "Authentication required",
        });

      return null;
    }

    return req.user;
  };



const createSupplyRequest =
  catchAsync(
    async (
      req:
        Request,

      res:
        Response
    ) => {
      const user =
        requireUser(
          req,
          res
        );

      if (
        !user
      ) {
        return;
      }

      const result =
        await SupplyRequestService
          .createSupplyRequestInDB(
            {
              ...req.body,

              farmerId:
                user.id,

              farmerEmail:
                user.email,


              farmerName:
                String(
                  req.body
                    ?.farmerName ||
                    user.name ||
                    ""
                ).trim(),
            }
          );

      sendResponse(
        res,
        {
          statusCode:
            201,

          success:
            true,

          message:
            "Product submitted successfully. Keep your tracking ID and wait for AgriNova approval before delivering the product.",

          data:
            result,
        }
      );
    }
  );



const getMySupplyRequests =
  catchAsync(
    async (
      req:
        Request,

      res:
        Response
    ) => {
      const user =
        requireUser(
          req,
          res
        );

      if (
        !user
      ) {
        return;
      }

      const result =
        await SupplyRequestService
          .getMySupplyRequestsFromDB(
            user.id,

            {
              status:
                typeof req
                  .query
                  .status ===
                "string"
                  ? req
                      .query
                      .status
                  : undefined,

              page:
                typeof req
                  .query
                  .page ===
                "string"
                  ? req
                      .query
                      .page
                  : undefined,

              limit:
                typeof req
                  .query
                  .limit ===
                "string"
                  ? req
                      .query
                      .limit
                  : undefined,
            }
          );

      sendResponse(
        res,
        {
          statusCode:
            200,

          success:
            true,

          message:
            "Your supply requests fetched successfully",

          meta:
            result.meta,

          data:
            result.data,
        }
      );
    }
  );



const getAllSupplyRequests =
  catchAsync(
    async (
      req:
        Request,

      res:
        Response
    ) => {
      const result =
        await SupplyRequestService
          .getAllSupplyRequestsFromDB(
            {
              status:
                typeof req
                  .query
                  .status ===
                "string"
                  ? req
                      .query
                      .status
                  : undefined,

              branch:
                typeof req
                  .query
                  .branch ===
                "string"
                  ? req
                      .query
                      .branch
                  : undefined,

              search:
                typeof req
                  .query
                  .search ===
                "string"
                  ? req
                      .query
                      .search
                  : undefined,

              page:
                typeof req
                  .query
                  .page ===
                "string"
                  ? req
                      .query
                      .page
                  : undefined,

              limit:
                typeof req
                  .query
                  .limit ===
                "string"
                  ? req
                      .query
                      .limit
                  : undefined,
            }
          );

      sendResponse(
        res,
        {
          statusCode:
            200,

          success:
            true,

          message:
            "Supply requests fetched successfully",

          meta:
            result.meta,

          data:
            result.data,
        }
      );
    }
  );



const getSupplyRequestById =
  catchAsync(
    async (
      req:
        Request,

      res:
        Response
    ) => {
      const requestId =
        getParam(
          req.params
            .requestId
        );

      const result =
        await SupplyRequestService
          .getSupplyRequestByIdFromDB(
            requestId
          );

      sendResponse(
        res,
        {
          statusCode:
            200,

          success:
            true,

          message:
            "Supply request fetched successfully",

          data:
            result,
        }
      );
    }
  );


const trackSupplyRequest =
  catchAsync(
    async (
      req:
        Request,

      res:
        Response
    ) => {
      const user =
        requireUser(
          req,
          res
        );

      if (
        !user
      ) {
        return;
      }

      const trackingCode =
        getParam(
          req.params
            .trackingCode
        );

      const result =
        await SupplyRequestService
          .trackSupplyRequestFromDB(
            user.id,

            trackingCode
          );

      sendResponse(
        res,
        {
          statusCode:
            200,

          success:
            true,

          message:
            "Supply request status retrieved successfully",

          data:
            result,
        }
      );
    }
  );



const updateSupplyRequestStatus =
  catchAsync(
    async (
      req:
        Request,

      res:
        Response
    ) => {
      const requestId =
        getParam(
          req.params
            .requestId
        );

      const result =
        await SupplyRequestService
          .updateSupplyRequestStatusInDB(
            requestId,

            req.body
              .status,

            req.body
              .adminNote
          );

      sendResponse(
        res,
        {
          statusCode:
            200,

          success:
            true,

          message:
            "Supply request status updated successfully",

          data:
            result,
        }
      );
    }
  );



export const SupplyRequestController =
  {
    createSupplyRequest,

    getMySupplyRequests,

    getAllSupplyRequests,

    getSupplyRequestById,

    trackSupplyRequest,

    updateSupplyRequestStatus,
  };