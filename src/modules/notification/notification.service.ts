import { isValidObjectId } from "mongoose";
import AppError from "../../utils/AppError";
import { INotification } from "./notification.interface";
import { Notification } from "./notification.model";

const createNotification = async (payload: INotification) => {
  return Notification.create(payload);
};

const createManyNotifications = async (payloads: INotification[]) => {
  if (!payloads.length) return [];
  return Notification.insertMany(payloads);
};

const getMyNotifications = async (userId: string, limit = 30) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 30, 1), 100);
  const [data, unreadCount] = await Promise.all([
    Notification.find({ userId }).sort({ createdAt: -1 }).limit(safeLimit).lean(),
    Notification.countDocuments({ userId, readAt: { $exists: false } }),
  ]);

  return { data, unreadCount };
};

const markNotificationRead = async (notificationId: string, userId: string) => {
  if (!isValidObjectId(notificationId)) {
    throw new AppError(400, "Invalid notification id");
  }

  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { $set: { readAt: new Date() } },
    { new: true }
  );

  if (!notification) throw new AppError(404, "Notification not found");
  return notification;
};

const markAllNotificationsRead = async (userId: string) => {
  await Notification.updateMany(
    { userId, readAt: { $exists: false } },
    { $set: { readAt: new Date() } }
  );
  return true;
};

export const NotificationService = {
  createNotification,
  createManyNotifications,
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};