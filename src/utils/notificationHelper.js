/**
 * Notification Helper Utilities
 * Centralized functions for sending notifications with automatic user lookup
 * Reduces code duplication across controllers
 *
 * Usage:
 *   import { notifyAction, notifyUsers } from "#utils/notificationHelper.js";
 *
 *   await notifyAction(req.user._id, (userName) => `${userName} created a new item`);
 *   await notifyAction(req.user._id, (userName, itemName) => `${userName} added ${itemName}`, item.name);
 */

import { userModel } from "#db/models/User.model.js";
import { sendNotificationLogic } from "#modules/notification/controller/notification.controller.js";
import logger from "#utils/logService.js";

/**
 * Send notification with automatic user lookup
 * Eliminates the need to manually fetch user before sending notification
 *
 * @param {string} userId - ID of user performing action
 * @param {Function} messageTemplate - Function that takes userName and returns message
 * @param {...any} args - Additional arguments for message template
 * @returns {Promise<void>}
 *
 * @example
 * // Before (4 lines):
 * const findUser = await userModel.findById(req.user._id);
 * const message = `${findUser.name} added new insurance company: ${name}`;
 * await sendNotificationLogic({ senderId: req.user._id, message });
 *
 * // After (1 line):
 * await notifyAction(req.user._id, (userName, name) =>
 *   `${userName} added new insurance company: ${name}`, name
 * );
 */
export const notifyAction = async (userId, messageTemplate, ...args) => {
  try {
    // Fetch user details
    const user = await userModel.findById(userId).select('name email').lean();

    if (!user) {
      logger.warn('User not found for notification', { userId });
      return;
    }

    // Generate message using template
    const message = messageTemplate(user.name, ...args);

    // Send notification
    await sendNotificationLogic({
      senderId: userId,
      message
    });

    logger.info('Notification sent', {
      userId,
      userName: user.name,
      message
    });
  } catch (error) {
    logger.error('Failed to send notification', {
      userId,
      error: error.message
    });
    // Don't throw - notifications are non-critical
  }
};

/**
 * Send notification without user lookup (when you already have user details)
 *
 * @param {string} userId - ID of user performing action
 * @param {string} userName - Name of user (from req.userDetails or req.user)
 * @param {string} message - Notification message
 * @returns {Promise<void>}
 *
 * @example
 * await notifyWithUserName(req.user._id, req.userDetails.name, "User updated profile");
 */
export const notifyWithUserName = async (userId, userName, message) => {
  try {
    await sendNotificationLogic({
      senderId: userId,
      message
    });

    logger.info('Notification sent', { userId, userName, message });
  } catch (error) {
    logger.error('Failed to send notification', {
      userId,
      userName,
      error: error.message
    });
  }
};

/**
 * Send notification to multiple users
 *
 * @param {Array<string>} userIds - Array of user IDs to notify
 * @param {string} message - Notification message
 * @returns {Promise<void>}
 *
 * @example
 * const adminIds = ['id1', 'id2', 'id3'];
 * await notifyUsers(adminIds, "New accident report submitted");
 */
export const notifyUsers = async (userIds, message) => {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    logger.warn('No user IDs provided for notification');
    return;
  }

  try {
    const notificationPromises = userIds.map(userId =>
      sendNotificationLogic({
        senderId: userId,
        message
      })
    );

    await Promise.all(notificationPromises);

    logger.info('Notifications sent to multiple users', {
      userCount: userIds.length,
      message
    });
  } catch (error) {
    logger.error('Failed to send notifications to multiple users', {
      userCount: userIds.length,
      error: error.message
    });
  }
};

/**
 * Common notification templates for standardized messages
 */
export const NotificationTemplates = {
  /**
   * Entity created notification
   */
  created: (entityType) => (userName, entityName) =>
    `${userName} created new ${entityType}: ${entityName}`,

  /**
   * Entity updated notification
   */
  updated: (entityType) => (userName, entityName) =>
    `${userName} updated ${entityType}: ${entityName}`,

  /**
   * Entity deleted notification
   */
  deleted: (entityType) => (userName, entityName) =>
    `${userName} deleted ${entityType}: ${entityName}`,

  /**
   * Status changed notification
   */
  statusChanged: (entityType) => (userName, entityName, oldStatus, newStatus) =>
    `${userName} changed ${entityType} ${entityName} status from ${oldStatus} to ${newStatus}`,

  /**
   * Assignment notification
   */
  assigned: (entityType) => (userName, entityName, assigneeName) =>
    `${userName} assigned ${entityType} ${entityName} to ${assigneeName}`,

  /**
   * Custom action notification
   */
  customAction: (action) => (userName, details) =>
    `${userName} ${action}: ${details}`
};

/**
 * Send notification using predefined template
 *
 * @param {string} userId - ID of user performing action
 * @param {Function} template - Template function from NotificationTemplates
 * @param {...any} args - Arguments for template
 * @returns {Promise<void>}
 *
 * @example
 * await notifyWithTemplate(
 *   req.user._id,
 *   NotificationTemplates.created('agent'),
 *   agentName
 * );
 *
 * await notifyWithTemplate(
 *   req.user._id,
 *   NotificationTemplates.statusChanged('accident'),
 *   ticketNumber,
 *   'open',
 *   'closed'
 * );
 */
export const notifyWithTemplate = async (userId, template, ...args) => {
  return notifyAction(userId, template, ...args);
};

export default {
  notifyAction,
  notifyWithUserName,
  notifyUsers,
  notifyWithTemplate,
  NotificationTemplates
};
