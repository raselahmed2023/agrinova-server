import { Request, Response } from "express";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { AdminService } from "../admin.service";
import AppError from "../../../utils/AppError";
import httpStatus from "http-status";

export const ConsultationController = {
  getAdminConsultations: catchAsync(async (req: Request, res: Response) => {
    const result = await AdminService.getAdminConsultationsFromDB(req.query);
    sendResponse(res, { statusCode: 200, success: true, message: "Consultations retrieved successfully", meta: result.meta, data: result.data });
  }),

  getAdminConsultationById: catchAsync(async (req: Request, res: Response) => {
    const { consultationId } = req.params;
    const consultation = await AdminService.getAdminConsultationByIdFromDB(consultationId as string);
    if (!consultation) throw new AppError(httpStatus.NOT_FOUND, "Consultation not found");
    sendResponse(res, { statusCode: 200, success: true, message: "Consultation details retrieved successfully", data: consultation });
  })
};