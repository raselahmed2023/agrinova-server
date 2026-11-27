import type { Request, Response } from "express";
import AppError from "../../../utils/AppError";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { ExpertServices } from "./expert.service";

const getExpertDashboard = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "Authentication required");
  }

  const result = await ExpertServices.getExpertDashboardFromDB(req.user);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Expert dashboard data retrieved successfully",
    data: result,
  });
});

const getExpertProfile = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "Authentication required");
  }

  const result = await ExpertServices.getExpertProfileFromDB(req.user);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Expert profile retrieved successfully",
    data: result,
  });
});

const updateExpertProfile = catchAsync(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError(401, "Authentication required");
  }

  const result = await ExpertServices.updateExpertProfileInDB(
    req.user,
    req.body
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Expert profile updated successfully",
    data: result,
  });
});

const getExpertAvailability = catchAsync(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError(401, "Authentication required");
    }

    const result = await ExpertServices.getExpertAvailabilityFromDB(req.user);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Expert availability retrieved successfully",
      data: result,
    });
  }
);

const updateExpertAvailability = catchAsync(
  async (req: Request, res: Response) => {
    if (!req.user) {
      throw new AppError(401, "Authentication required");
    }

    const result = await ExpertServices.updateExpertAvailabilityInDB(
      req.user,
      req.body
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Expert availability updated successfully",
      data: result,
    });
  }
);

const getAllExperts = catchAsync(async (_req: Request, res: Response) => {
  const result = await ExpertServices.getAllExpertsFromDB();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Experts retrieved successfully",
    data: result,
  });
});

export const ExpertControllers = {
  getExpertDashboard,
  getExpertProfile,
  updateExpertProfile,
  getExpertAvailability,
  updateExpertAvailability,
  getAllExperts,
};
