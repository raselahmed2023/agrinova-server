import {
  Request,
  Response,
} from "express";

import httpStatus from "http-status";

import catchAsync from "../../../utils/catchAsync";

import sendResponse from "../../../utils/sendResponse";

import AppError from "../../../utils/AppError";

import {
  AdminService,
} from "../admin.service";

export const ExpertController = {
  getPendingExperts:
    catchAsync(
      async (
        req:
          Request,

        res:
          Response
      ) => {
        const result =
          await AdminService.getPendingExpertsFromDB(
            req.query
          );

        sendResponse(
          res,
          {
            statusCode:
              200,

            success:
              true,

            message:
              "Pending expert applications retrieved successfully",

            meta:
              result.meta,

            data:
              result.data,
          }
        );
      }
    ),

  getExpertById:
    catchAsync(
      async (
        req:
          Request,

        res:
          Response
      ) => {
        const expert =
          await AdminService.getExpertByIdFromDB(
            String(
              req.params
                .expertId
            )
          );

        if (!expert) {
          throw new AppError(
            httpStatus.NOT_FOUND,
            "Expert not found"
          );
        }

        sendResponse(
          res,
          {
            statusCode:
              200,

            success:
              true,

            message:
              "Expert details retrieved successfully",

            data:
              expert,
          }
        );
      }
    ),

  approveExpert:
    catchAsync(
      async (
        req:
          Request,

        res:
          Response
      ) => {
        const updatedExpert =
          await AdminService.approveExpertInDB(
            String(
              req.params
                .expertId
            )
          );

        sendResponse(
          res,
          {
            statusCode:
              200,

            success:
              true,

            message:
              "Expert approved successfully",

            data:
              updatedExpert,
          }
        );
      }
    ),

  rejectExpert:
    catchAsync(
      async (
        req:
          Request,

        res:
          Response
      ) => {
        const updatedExpert =
          await AdminService.rejectExpertInDB(
            String(
              req.params
                .expertId
            ),

            typeof req.body
              ?.reason ===
            "string"
              ? req.body.reason
              : undefined
          );

        sendResponse(
          res,
          {
            statusCode:
              200,

            success:
              true,

            message:
              "Expert application rejected successfully",

            data:
              updatedExpert,
          }
        );
      }
    ),
};