import { Request, Response } from "express";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { AdminService } from "../admin.service";
import AppError from "../../../utils/AppError";
import httpStatus from "http-status";

export const FarmController = {
  getAdminFarms: catchAsync(async (req: Request, res: Response) => {
    const result = await AdminService.getAdminFarmsFromDB(req.query);
    sendResponse(res, { statusCode: 200, success: true, message: "Farms retrieved successfully", meta: result.meta, data: result.data });
  }),

  getAdminFarmById: catchAsync(async (req: Request, res: Response) => {
    const { farmId } = req.params;
    const farm = await AdminService.getAdminFarmByIdFromDB(farmId as string);
    if (!farm) throw new AppError(httpStatus.NOT_FOUND, "Farm not found");
    sendResponse(res, { statusCode: 200, success: true, message: "Farm details retrieved successfully", data: farm });
  })
};