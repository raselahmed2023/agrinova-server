import { Request, Response } from "express";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { AdminService } from "../admin.service";
import AppError from "../../../utils/AppError";
import httpStatus from "http-status";

export const ExpertController = {
  getPendingExperts: catchAsync(async (req: Request, res: Response) => {
    const result = await AdminService.getPendingExpertsFromDB();
    sendResponse(res, { statusCode: 200, success: true, message: "Pending expert applications retrieved successfully", data: result });
  }),

  getExpertById: catchAsync(async (req: Request, res: Response) => {
    const { expertId } = req.params;
    const expert = await AdminService.getExpertByIdFromDB(expertId as string);
    if (!expert) throw new AppError(httpStatus.NOT_FOUND, "Expert not found");
    sendResponse(res, { statusCode: 200, success: true, message: "Expert details retrieved successfully", data: expert });
  }),

  approveExpert: catchAsync(async (req: Request, res: Response) => {
    const { expertId } = req.params;
    const updatedExpert = await AdminService.approveExpertInDB(expertId as string);
    sendResponse(res, { statusCode: 200, success: true, message: "Expert approved successfully", data: updatedExpert });
  }),

  rejectExpert: catchAsync(async (req: Request, res: Response) => {
    const { expertId } = req.params;
    const { reason } = req.body;
    const updatedExpert = await AdminService.rejectExpertInDB(expertId as string, reason);
    sendResponse(res, { statusCode: 200, success: true, message: "Expert application rejected successfully", data: updatedExpert });
  })
};