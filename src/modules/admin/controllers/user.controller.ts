import { Request, Response } from "express";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { AdminService } from "../admin.service";
import AppError from "../../../utils/AppError";
import httpStatus from "http-status";

export const UserController = {
  getUsers: catchAsync(async (req: Request, res: Response) => {
    const result = await AdminService.getUsersFromDB(req.query);
    sendResponse(res, { statusCode: 200, success: true, message: "Users retrieved successfully", meta: result.meta, data: result.data });
  }),

  getUserById: catchAsync(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const user = await AdminService.getUserByIdFromDB(userId as string);
    if (!user) throw new AppError(httpStatus.NOT_FOUND, "User not found");
    sendResponse(res, { statusCode: 200, success: true, message: "User details retrieved successfully", data: user });
  }),

  blockUser: catchAsync(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const updatedUser = await AdminService.updateUserStatusInDB(userId as string, "BLOCKED");
    if (!updatedUser) throw new AppError(httpStatus.NOT_FOUND, "User not found");
    sendResponse(res, { statusCode: 200, success: true, message: "User blocked successfully", data: updatedUser });
  }),

  unblockUser: catchAsync(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const updatedUser = await AdminService.updateUserStatusInDB(userId as string, "ACTIVE");
    if (!updatedUser) throw new AppError(httpStatus.NOT_FOUND, "User not found");
    sendResponse(res, { statusCode: 200, success: true, message: "User unblocked successfully", data: updatedUser });
  }),

  getAdminProfile: catchAsync(async (req: Request, res: Response) => {
    const adminId = req.user?.id;
    const profile = await AdminService.getAdminProfileFromDB(adminId as string);
    sendResponse(res, { statusCode: 200, success: true, message: "Admin profile retrieved successfully", data: profile });
  }),

  updateAdminProfile: catchAsync(async (req: Request, res: Response) => {
    const adminId = req.user?.id;
    const updatedProfile = await AdminService.updateAdminProfileInDB(adminId as string, req.body);
    sendResponse(res, { statusCode: 200, success: true, message: "Admin profile updated successfully", data: updatedProfile });
  })
};