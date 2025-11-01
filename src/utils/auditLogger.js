/**
 * Audit Logger Utility
 * Centralized audit logging to eliminate 13 duplicate logAudit functions
 */

import AuditLogModel from "#db/models/AuditLog.model.js";
import logger from "#utils/logService.js";

/**
 * Log an audit entry for tracking system changes
 * @param {Object} params - Audit log parameters
 * @param {string} params.userId - ID of user performing action
 * @param {string} params.action - Description of action performed
 * @param {string} params.entity - Type of entity affected
 * @param {string} params.entityId - ID of affected entity
 * @param {string} params.userName - Name of user performing action
 * @param {Object} params.oldValue - Previous state (optional)
 * @param {Object} params.newValue - New state (optional)
 * @returns {Promise<void>}
 *
 * @example
 * await logAudit({
 *   userId: req.user._id,
 *   userName: req.userDetails.name,
 *   action: 'Create Agent',
 *   entity: 'User',
 *   entityId: newAgent._id,
 *   oldValue: null,
 *   newValue: newAgent.toObject()
 * });
 */
export const logAudit = async ({
  userId,
  action,
  entity,
  entityId,
  userName,
  oldValue = null,
  newValue = null
}) => {
  try {
    await AuditLogModel.create({
      user: userId,
      action,
      entity,
      entityId,
      oldValue,
      newValue,
      userName
    });

    logger.info('Audit log created', {
      userId,
      userName,
      action,
      entity,
      entityId
    });
  } catch (error) {
    logger.error("Failed to create audit log:", error);
    // Don't throw - audit logging should not break the main operation
  }
};

export default logAudit;
