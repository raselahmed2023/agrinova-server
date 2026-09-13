import type { Request, Response } from "express";
import AppError from "../../utils/AppError";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { NotificationService } from "./notification.service";

const requireUser = (req: Request) => {
  if (!req.user) throw new AppError(401, "Authentication required");
  return req.user;
};

const getMine = catchAsync(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const result = await NotificationService.getMyNotifications(
    user.id,
    Number(req.query.limit) || 30
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Notifications retrieved successfully",
    data: result,
  });
});

const markRead = catchAsync(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const result = await NotificationService.markNotificationRead(
    String(req.params.notificationId),
    user.id
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Notification marked as read",
    data: result,
  });
});

const markAllRead = catchAsync(async (req: Request, res: Response) => {
  const user = requireUser(req);
  await NotificationService.markAllNotificationsRead(user.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "All notifications marked as read",
    data: true,
  });
});

export const NotificationController = { getMine, markRead, markAllRead };