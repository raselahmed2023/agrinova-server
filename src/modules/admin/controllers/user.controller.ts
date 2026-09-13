import { Request, Response } from "express";
import catchAsync from "../../../utils/catchAsync";
import sendResponse from "../../../utils/sendResponse";
import { AdminService } from "../admin.service";
import AppError from "../../../utils/AppError";
import httpStatus from "http-status";

export const UserController = {
  getUsers: catchAsync(async (req: Request, res: Response) => {
    const result = await AdminService.getUsersFromDB(req.query);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Users retrieved successfully",
      meta: result.meta,
      data: result.data,
    });
  }),

  getUserById: catchAsync(async (req: Request, res: Response) => {
    const user = await AdminService.getUserByIdFromDB(String(req.params.userId));
    if (!user) throw new AppError(httpStatus.NOT_FOUND, "User not found");

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "User details retrieved successfully",
      data: user,
    });
  }),

  blockUser: catchAsync(async (req: Request, res: Response) => {
    const updatedUser = await AdminService.blockUserInDB(String(req.params.userId));
    if (!updatedUser) throw new AppError(httpStatus.NOT_FOUND, "User not found");

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "User blocked successfully",
      data: updatedUser,
    });
  }),

  unblockUser: catchAsync(async (req: Request, res: Response) => {
    const updatedUser = await AdminService.unblockUserInDB(String(req.params.userId));
    if (!updatedUser) throw new AppError(httpStatus.NOT_FOUND, "User not found");

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "User unblocked successfully",
      data: updatedUser,
    });
  }),

  getAdminProfile: catchAsync(async (req: Request, res: Response) => {
    const adminId = req.user?.id;
    const profile = await AdminService.getAdminProfileFromDB(String(adminId));
    if (!profile) throw new AppError(httpStatus.NOT_FOUND, "Admin profile not found");

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Admin profile retrieved successfully",
      data: profile,
    });
  }),

  updateAdminProfile: catchAsync(async (req: Request, res: Response) => {
    const adminId = req.user?.id;
    const payload = {
      name: typeof req.body?.name === "string" ? req.body.name : undefined,
      phone: typeof req.body?.phone === "string" ? req.body.phone : undefined,
    };

    const updatedProfile = await AdminService.updateAdminProfileInDB(
      String(adminId),
      payload
    );

    if (!updatedProfile) {
      throw new AppError(httpStatus.NOT_FOUND, "Admin profile not found");
    }

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Admin profile updated successfully",
      data: updatedProfile,
    });
  }),
};