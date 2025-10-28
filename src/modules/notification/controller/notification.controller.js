import notificationModel from "../../../../DB/models/Notification.model.js";
import { userModel } from "../../../../DB/models/User.model.js";
import { io, onlineUsers } from "../../../../index.js";
import mongoose from 'mongoose';
import { getPaginationParams, buildPaginatedResponse } from "../../../utils/pagination.js";

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

  return notifications;
};


export const createNotification = async (req, res) => {
  try {
    const senderId = req.user._id;
    const { message } = req.body;

    const notifications = await sendNotificationLogic({ senderId, message });

    return res.status(201).json({
      message: "Notification(s) sent successfully",
      notifications,
    });

  } catch (error) {
    console.error("Error creating notification:", error);
    return res.status(500).json({ message: `An error occurred: ${error.message}` });
  }
};


export const getNotifications = async (req, res) => {
    try {
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

        return res.status(200).json({
            message: "Notifications retrieved successfully",
            unreadCount,
            ...response
        });

    } catch (error) {
        return res.status(500).json({ message: `An error occurred: ${error.message}` });
    }
};


export const markAsRead = async (req, res) => {
    try {
        const { notificationId } = req.params;
        const userId = req.user.id;

        const notification = await notificationModel.findOneAndUpdate(
            { _id: notificationId, recipient: userId },
            { isRead: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ message: "Notification not found or you do not have permission to update it" });
        }

        return res.status(200).json({ message: "Notification marked as read successfully", notification });

    } catch (error) {
        return res.status(500).json({ message: `An error occurred: ${error.message}` });
    }
};


export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id;

   
    const result = await notificationModel.updateMany(
      { recipient: userId, isRead: false },
      { $set: { isRead: true } }
    );

    return res.status(200).json({
      message: "All notifications marked as read successfully",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return res.status(500).json({ message: `An error occurred: ${error.message}` });
  }
};