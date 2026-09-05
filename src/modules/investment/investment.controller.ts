import type {
  Request,
  Response,
} from "express";

import AppError from "../../utils/AppError";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";

import {
  TInvestmentStatus,
} from "./investment.interface";

import {
  InvestmentService,
} from "./investment.service";

const requireUser = (
  req: Request
) => {
  if (!req.user) {
    throw new AppError(
      401,
      "Authentication required"
    );
  }

  return req.user;
};

const createInvestmentProject =
  catchAsync(
    async (
      req: Request,
      res: Response
    ) => {
      const user =
        requireUser(req);

      const result =
        await InvestmentService
          .createInvestmentProjectInDB(
            req.body,
            {
              id:
                user.id,

              name:
                user.name,

              email:
                user.email,
            }
          );

      sendResponse(res, {
        statusCode: 201,
        success: true,
        message:
          "Investment request submitted for admin review",
        data: result,
      });
    }
  );

const getMyInvestmentProjects =
  catchAsync(
    async (
      req: Request,
      res: Response
    ) => {
      const user =
        requireUser(req);

      const result =
        await InvestmentService
          .getMyInvestmentProjectsFromDB(
            user.id
          );

      sendResponse(res, {
        statusCode: 200,
        success: true,
        message:
          "Investment projects retrieved successfully",
        data: result,
      });
    }
  );

const getMyInvestmentProjectById =
  catchAsync(
    async (
      req: Request,
      res: Response
    ) => {
      const user =
        requireUser(req);

      const projectId =
        String(
          req.params
            .projectId
        );

      const result =
        await InvestmentService
          .getMyInvestmentProjectByIdFromDB(
            projectId,
            user.id
          );

      sendResponse(res, {
        statusCode: 200,
        success: true,
        message:
          "Investment project retrieved successfully",
        data: result,
      });
    }
  );

const updateMyInvestmentProject =
  catchAsync(
    async (
      req: Request,
      res: Response
    ) => {
      const user =
        requireUser(req);

      const projectId =
        String(
          req.params
            .projectId
        );

      const result =
        await InvestmentService
          .updateMyInvestmentProjectInDB(
            projectId,
            user.id,
            req.body
          );

      sendResponse(res, {
        statusCode: 200,
        success: true,
        message:
          "Investment project updated successfully",
        data: result,
      });
    }
  );

const deleteMyInvestmentProject =
  catchAsync(
    async (
      req: Request,
      res: Response
    ) => {
      const user =
        requireUser(req);

      const projectId =
        String(
          req.params
            .projectId
        );

      const result =
        await InvestmentService
          .deleteMyInvestmentProjectFromDB(
            projectId,
            user.id
          );

      sendResponse(res, {
        statusCode: 200,
        success: true,
        message:
          "Investment request withdrawn successfully",
        data: result,
      });
    }
  );

const getAdminInvestmentProjects =
  catchAsync(
    async (
      req: Request,
      res: Response
    ) => {
      const result =
        await InvestmentService
          .getAdminInvestmentProjectsFromDB(
            req.query
          );

      sendResponse(res, {
        statusCode: 200,
        success: true,
        message:
          "Investment projects retrieved successfully",
        meta:
          result.meta,
        data:
          result.data,
      });
    }
  );

const getAdminInvestmentProjectById =
  catchAsync(
    async (
      req: Request,
      res: Response
    ) => {
      const projectId =
        String(
          req.params
            .projectId
        );

      const result =
        await InvestmentService
          .getAdminInvestmentProjectByIdFromDB(
            projectId
          );

      sendResponse(res, {
        statusCode: 200,
        success: true,
        message:
          "Investment project retrieved successfully",
        data: result,
      });
    }
  );

const reviewInvestmentProject =
  catchAsync(
    async (
      req: Request,
      res: Response
    ) => {
      const projectId =
        String(
          req.params
            .projectId
        );

      const result =
        await InvestmentService
          .reviewInvestmentProjectInDB(
            projectId,

            req.body
              .status as TInvestmentStatus,

            req.body
              .adminNote
          );

      sendResponse(res, {
        statusCode: 200,
        success: true,
        message:
          req.body.status ===
          "APPROVED"
            ? "Investment project approved successfully"
            : "Investment project rejected successfully",
        data: result,
      });
    }
  );

export const InvestmentController =
  {
    createInvestmentProject,
    getMyInvestmentProjects,
    getMyInvestmentProjectById,
    updateMyInvestmentProject,
    deleteMyInvestmentProject,

    getAdminInvestmentProjects,
    getAdminInvestmentProjectById,
    reviewInvestmentProject,
  };