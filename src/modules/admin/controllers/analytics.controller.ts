import { Request, Response } from "express";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { AdminService } from "../admin.service";

export const AnalyticsController = {
  getDashboard: catchAsync(async (req: Request, res: Response) => {
    const result = await AdminService.getDashboardStatsFromDB();
    sendResponse(res, { statusCode: 200, success: true, message: "Admin dashboard stats retrieved successfully", data: result });
  }),

  getAdminAnalytics: catchAsync(async (req: Request, res: Response) => {
    const analytics = await AdminService.getAdminAnalyticsFromDB();
    sendResponse(res, { statusCode: 200, success: true, message: "Analytics retrieved successfully", data: analytics });
  })
};