import notificationModel from "#db/models/Notification.model.js";
import { userModel } from "#db/models/User.model.js";
import { io, onlineUsers } from "../../../../index.js";
import mongoose from 'mongoose';
import { getPaginationParams, buildPaginatedResponse } from "#utils/pagination.js";
import logger from "#utils/logService.js";
import { asyncHandler } from "#utils/asyncHandler.js";
import { logAudit } from "#utils/auditLogger.js";
import {
  successResponse,
  createdResponse,
  notFoundResponse
} from "#utils/apiResponse.js";

const { ObjectId } = mongoose.Types;

export const sendNotificationLogic = async ({ senderId, message }) => {
  if (!senderId || !message) {
    throw new Error("senderId and message are required");
  }

  const sender = await userModel.findById(senderId).lean();
  if (!sender) {
    throw new Error("Sender not found");
  }

  let recipients = [];

  if (sender.role === "employee") {
    const departmentHead = await userModel.findOne({
      departmentId: sender.departmentId,
      role: "head"
    }).lean();

    if (departmentHead) recipients.push(departmentHead._id);
  }

  const admins = await userModel.find({ role: "admin" }).lean();
  recipients.push(...admins.map(admin => admin._id));

  recipients = [...new Set(recipients.map(id => id.toString()))];

  const notifications = await Promise.all(
    recipients.map(async (recipientId) => {
      const newNotification = new notificationModel({
        recipient: recipientId,
        sender: senderId,
        message,
      });
      await newNotification.save();

      const recipientSocket = onlineUsers.get(recipientId.toString());
      if (recipientSocket) {
        io.to(recipientSocket).emit("newNotification", newNotification);
      }

      return newNotification;
    })
  );

  logger.info("Notifications sent", {
    senderId,
    senderRole: sender.role,
    recipientCount: notifications.length
  });

  return notifications;
};

export const createNotification = asyncHandler(async (req, res) => {
  const senderId = req.user._id;
  const { message } = req.body;

  const notifications = await sendNotificationLogic({ senderId, message });

  return createdResponse(res, {
    notifications
  }, "Notification(s) sent successfully");
});

export const list = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { isRead } = req.query;
  const { page, limit, skip } = getPaginationParams(req.query);

  // Build query
  const query = { recipient: userId };
  if (isRead !== undefined) {
    query.isRead = isRead === 'true';
  }

  // Get notifications with pagination
  const [notifications, total] = await Promise.all([
    notificationModel
      .find(query)
      .populate('sender', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    notificationModel.countDocuments(query)
  ]);

  // Count unread notifications
  const unreadCount = await notificationModel.countDocuments({
    recipient: userId,
    isRead: false
  });

  const response = buildPaginatedResponse(notifications, total, page, limit);

  logger.info("Notifications retrieved", {
    userId,
    total,
    unreadCount
  });

  return successResponse(res, {
    unreadCount,
    ...response
  }, "Notifications retrieved successfully");
});

export const markAsRead = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;
  const userId = req.user.id;

  const notification = await notificationModel.findOneAndUpdate(
    { _id: notificationId, recipient: userId },
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    return notFoundResponse(res, "Notification not found or you do not have permission to update it");
  }

  logger.info("Notification marked as read", {
    notificationId,
    userId
  });

  return successResponse(res, { notification }, "Notification marked as read successfully");
});

export const markAllAsRead = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const result = await notificationModel.updateMany(
    { recipient: userId, isRead: false },
    { $set: { isRead: true } }
  );

  logger.info("All notifications marked as read", {
    userId,
    modifiedCount: result.modifiedCount
  });

  return successResponse(res, {
    modifiedCount: result.modifiedCount
  }, "All notifications marked as read successfully");
});
