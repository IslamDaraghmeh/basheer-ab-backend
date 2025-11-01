import AuditLogModel from "#db/models/AuditLog.model.js";
import logger from "#utils/logService.js";
import { asyncHandler } from "#utils/asyncHandler.js";
import { logAudit } from "#utils/auditLogger.js";
import { successResponse } from "#utils/apiResponse.js";

export const list = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Build filter object for optional filtering
  const filter = {};
  if (req.query.action) {
    filter.action = req.query.action;
  }
  if (req.query.userId) {
    filter.user = req.query.userId;
  }
  if (req.query.entity) {
    filter.entity = req.query.entity;
  }

  const total = await AuditLogModel.countDocuments(filter);
  const logs = await AuditLogModel.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('user', 'userName email'); // Optional: populate user info

  logger.info("Audit logs retrieved", {
    total,
    page,
    filters: filter
  });

  return successResponse(res, {
    logs,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }, "Audit logs retrieved successfully");
});
