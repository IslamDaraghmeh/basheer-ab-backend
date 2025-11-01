import { accidentModel } from "#db/models/Accident.model.js";
import { AccidentCommentModel } from "#db/models/AccidentComment.model.js";
import { uploadToLocal } from "#utils/fileUpload.js";
import { uploadMultipleFiles } from "#utils/fileUploadHelper.js";
import { insuredModel } from '#db/models/Insured.model.js';
import { userModel } from "#db/models/User.model.js";
import { sendNotificationLogic } from "../../notification/controller/notification.controller.js";
import { notifyAction } from "#utils/notificationHelper.js";
import logger from "#utils/logService.js";
import { asyncHandler } from "#utils/asyncHandler.js";
import { logAudit } from "#utils/auditLogger.js";
import {
  successResponse,
  createdResponse,
  notFoundResponse,
  badRequestResponse
} from "#utils/apiResponse.js";

export const create = asyncHandler(async (req, res) => {
  const { insuredId, vehicleId } = req.params;
  const { notes, description, title, priority } = req.body;

  // Support both notes (old) and description (new)
  const accidentDescription = description || notes;

  if (!insuredId || !vehicleId || !accidentDescription) {
    return badRequestResponse(res, "Missing required fields: insuredId, vehicleId, and description are required");
  }

  const insured = await insuredModel.findById(insuredId);
  if (!insured) {
    return notFoundResponse(res, "Insured");
  }

  const vehicle = insured.vehicles.id(vehicleId);
  if (!vehicle) {
    return notFoundResponse(res, "Vehicle for this insured");
  }

  // Upload accident images using helper
  const uploadedImages = await uploadMultipleFiles(req.files, "accidents");

  const newAccident = new accidentModel({
    insured: insuredId,
    vehicleId,
    title: title || "Vehicle Accident Report",
    description: accidentDescription,
    notes: accidentDescription, // For backward compatibility
    images: uploadedImages,
    status: "open",
    priority: priority || "medium",
    statusHistory: [{
      status: "open",
      changedBy: req.user._id,
      changedAt: new Date(),
      comment: "Accident ticket created"
    }]
  });

  const savedAccident = await newAccident.save();

  // Send notification using helper
  await notifyAction(
    req.user._id,
    (userName, ticketNumber) => `${userName} created accident ticket ${ticketNumber}`,
    savedAccident.ticketNumber
  );

  // Log audit (user name will be fetched again, but needed for audit)
  const user = await userModel.findById(req.user._id);
  await logAudit({
    userId: req.user._id,
    userName: user.name,
    action: `Create Accident Ticket by ${user.name}`,
    entity: "Accident",
    entityId: savedAccident._id,
    newValue: savedAccident
  });

  logger.info("Accident ticket created", {
    ticketNumber: savedAccident.ticketNumber,
    insuredId,
    vehicleId,
    userId: req.user._id
  });

  return createdResponse(res, { accident: savedAccident }, "Accident ticket created successfully");
});

export const list = asyncHandler(async (req, res) => {
  const { insuredId, vehicleId, status, priority } = req.query;

  let filter = {};
  if (insuredId) filter.insured = insuredId;
  if (vehicleId) filter.vehicleId = vehicleId;
  if (status) filter.status = status;
  if (priority) filter.priority = priority;

  const accidents = await accidentModel
    .find(filter)
    .populate("insured", "first_name last_name id_Number")
    .populate("assignedTo", "name email")
    .sort({ createdAt: -1 });

  if (!accidents || accidents.length === 0) {
    return notFoundResponse(res, "No accidents found");
  }

  logger.info("Accident tickets retrieved", {
    count: accidents.length,
    filters: filter
  });

  return successResponse(res, {
    count: accidents.length,
    accidents
  }, "Accident tickets fetched successfully");
});

/**
 * Get all accidents with pagination
 * GET /api/v1/accident/all?page=1&limit=10&status=open&priority=high&search=keyword
 */
export const getAllAccidentsWithPagination = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, priority, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Build filter
  let filter = {};
  if (status) filter.status = status;
  if (priority) filter.priority = priority;

  // Search in ticket number, title, or description
  if (search) {
    filter.$or = [
      { ticketNumber: { $regex: search, $options: 'i' } },
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  // Build sort object
  const sort = {};
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

  // Get total count for pagination
  const total = await accidentModel.countDocuments(filter);

  // Fetch accidents with pagination
  const accidents = await accidentModel
    .find(filter)
    .populate("insured", "first_name last_name id_Number phone_number")
    .populate("assignedTo", "name email")
    .sort(sort)
    .skip(skip)
    .limit(limitNum);

  logger.info("Accidents fetched with pagination", {
    page: pageNum,
    total,
    filters: filter
  });

  return successResponse(res, {
    pagination: {
      currentPage: pageNum,
      totalPages: Math.ceil(total / limitNum),
      totalItems: total,
      itemsPerPage: limitNum,
      hasNextPage: pageNum < Math.ceil(total / limitNum),
      hasPrevPage: pageNum > 1
    },
    accidents
  }, "Accidents fetched successfully");
});

export const deleteAccident = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const accident = await accidentModel.findById(id);
  if (!accident) {
    return notFoundResponse(res, "Accident");
  }

  await accidentModel.findByIdAndDelete(id);

  logger.info("Accident deleted", {
    accidentId: id,
    ticketNumber: accident.ticketNumber
  });

  return successResponse(res, null, "Accident deleted successfully");
});

export const count = asyncHandler(async (req, res) => {
  const count = await accidentModel.countDocuments();

  logger.info("Total accidents counted", { total: count });

  return successResponse(res, { total: count }, "Total accidents count");
});

export const updateAccident = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;

  const accident = await accidentModel.findById(id);
  if (!accident) {
    return notFoundResponse(res, "Accident");
  }

  if (notes) accident.notes = notes;

  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      const result = await uploadToLocal(file.path, {
        folder: "accidents",
      });
      accident.images.push(result.secure_url);
    }
  }

  if (req.body.status === "closed") {
    accident.status = "closed";
    accident.closedAt = new Date();
  }

  const updatedAccident = await accident.save();

  logger.info("Accident updated", {
    accidentId: id,
    ticketNumber: accident.ticketNumber
  });

  return successResponse(res, {
    accident: updatedAccident
  }, "Accident updated successfully");
});

export const accidentReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  let filter = {};

  if (startDate && endDate) {
    filter.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  } else if (startDate) {
    filter.createdAt = { $gte: new Date(startDate) };
  } else if (endDate) {
    filter.createdAt = { $lte: new Date(endDate) };
  }

  const accidents = await accidentModel
    .find(filter)
    .populate("insured", "first_name last_name id_Number")
    .populate("assignedTo", "name email")
    .sort({ createdAt: -1 });

  logger.info("Accident report generated", {
    startDate,
    endDate,
    totalAccidents: accidents.length
  });

  return successResponse(res, {
    totalAccidents: accidents.length,
    accidents
  }, "Accident report fetched successfully");
});

/**
 * Update accident status
 * PATCH /api/v1/accident/status/:id
 */
export const updateAccidentStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, comment } = req.body;

  if (!status) {
    return badRequestResponse(res, "Status is required");
  }

  const validStatuses = ["open", "in_progress", "pending_review", "resolved", "closed"];
  if (!validStatuses.includes(status)) {
    return badRequestResponse(res, "Invalid status value");
  }

  const accident = await accidentModel.findById(id);
  if (!accident) {
    return notFoundResponse(res, "Accident");
  }

  const oldStatus = accident.status;

  // Add to status history
  accident.statusHistory.push({
    status,
    changedBy: req.user._id,
    changedAt: new Date(),
    comment: comment || `Status changed from ${oldStatus} to ${status}`
  });

  accident.status = status;

  if (status === "resolved") {
    accident.resolvedAt = new Date();
  }

  if (status === "closed") {
    accident.closedAt = new Date();
  }

  const updatedAccident = await accident.save();

  const user = await userModel.findById(req.user._id);
  const message = `${user.name} updated ticket ${accident.ticketNumber} status to ${status}`;

  await sendNotificationLogic({
    senderId: req.user._id,
    message
  });

  await logAudit({
    userId: req.user._id,
    userName: user.name,
    action: `Update Accident Status by ${user.name}`,
    entity: "Accident",
    entityId: accident._id,
    oldValue: { status: oldStatus },
    newValue: { status }
  });

  logger.info("Accident status updated", {
    accidentId: id,
    ticketNumber: accident.ticketNumber,
    oldStatus,
    newStatus: status
  });

  return successResponse(res, { accident: updatedAccident }, "Accident status updated successfully");
});

/**
 * Assign accident to a user
 * PATCH /api/v1/accident/assign/:id
 */
export const assignAccident = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  if (!userId) {
    return badRequestResponse(res, "User ID is required");
  }

  const accident = await accidentModel.findById(id);
  if (!accident) {
    return notFoundResponse(res, "Accident");
  }

  const assignedUser = await userModel.findById(userId);
  if (!assignedUser) {
    return notFoundResponse(res, "User");
  }

  accident.assignedTo = userId;

  // Add to status history
  accident.statusHistory.push({
    status: accident.status,
    changedBy: req.user._id,
    changedAt: new Date(),
    comment: `Assigned to ${assignedUser.name}`
  });

  const updatedAccident = await accident.save();

  const user = await userModel.findById(req.user._id);
  const message = `${user.name} assigned ticket ${accident.ticketNumber} to ${assignedUser.name}`;

  await sendNotificationLogic({
    senderId: req.user._id,
    message
  });

  await logAudit({
    userId: req.user._id,
    userName: user.name,
    action: `Assign Accident by ${user.name}`,
    entity: "Accident",
    entityId: accident._id,
    newValue: { assignedTo: userId }
  });

  logger.info("Accident assigned", {
    accidentId: id,
    ticketNumber: accident.ticketNumber,
    assignedTo: assignedUser.name
  });

  return successResponse(res, { accident: updatedAccident }, "Accident assigned successfully");
});

/**
 * Add comment/reply to accident
 * POST /api/v1/accident/comment/:accidentId
 */
export const addComment = asyncHandler(async (req, res) => {
  const { accidentId } = req.params;
  const { comment, isInternal } = req.body;

  if (!comment) {
    return badRequestResponse(res, "Comment is required");
  }

  const accident = await accidentModel.findById(accidentId);
  if (!accident) {
    return notFoundResponse(res, "Accident");
  }

  let uploadedImages = [];
  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      const result = await uploadToLocal(file.path, {
        folder: "accident_comments",
      });
      uploadedImages.push(result.secure_url);
    }
  }

  const newComment = new AccidentCommentModel({
    accident: accidentId,
    user: req.user._id,
    comment,
    images: uploadedImages,
    isInternal: isInternal || false
  });

  const savedComment = await newComment.save();
  await savedComment.populate('user', 'name email');

  const user = await userModel.findById(req.user._id);
  const message = `${user.name} added a comment to ticket ${accident.ticketNumber}`;

  await sendNotificationLogic({
    senderId: req.user._id,
    message
  });

  logger.info("Comment added to accident", {
    accidentId,
    commentId: savedComment._id,
    userId: req.user._id
  });

  return createdResponse(res, { comment: savedComment }, "Comment added successfully");
});

/**
 * Get all comments for an accident
 * GET /api/v1/accident/comments/:accidentId
 */
export const getComments = asyncHandler(async (req, res) => {
  const { accidentId } = req.params;
  const { includeInternal } = req.query;

  const accident = await accidentModel.findById(accidentId);
  if (!accident) {
    return notFoundResponse(res, "Accident");
  }

  let filter = { accident: accidentId };

  // Only show internal comments to staff
  if (includeInternal !== 'true') {
    filter.isInternal = false;
  }

  const comments = await AccidentCommentModel.find(filter)
    .populate('user', 'name email')
    .sort({ createdAt: -1 });

  logger.info("Comments fetched for accident", {
    accidentId,
    count: comments.length
  });

  return successResponse(res, {
    count: comments.length,
    comments
  }, "Comments fetched successfully");
});

/**
 * Get accident by ticket number
 * GET /api/v1/accident/ticket/:ticketNumber
 */
export const getAccidentByTicketNumber = asyncHandler(async (req, res) => {
  const { ticketNumber } = req.params;

  const accident = await accidentModel.findOne({ ticketNumber })
    .populate("insured", "first_name last_name id_Number phone_number")
    .populate("assignedTo", "name email")
    .populate({
      path: 'statusHistory.changedBy',
      select: 'name email'
    });

  if (!accident) {
    return notFoundResponse(res, "Accident ticket");
  }

  // Get comments count
  const commentsCount = await AccidentCommentModel.countDocuments({ accident: accident._id });

  logger.info("Accident retrieved by ticket number", {
    ticketNumber
  });

  return successResponse(res, {
    accident,
    commentsCount
  }, "Accident ticket fetched successfully");
});

/**
 * Get accident statistics
 * GET /api/v1/accident/stats
 */
export const getAccidentStats = asyncHandler(async (req, res) => {
  const statusStats = await accidentModel.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 }
      }
    }
  ]);

  const priorityStats = await accidentModel.aggregate([
    {
      $group: {
        _id: "$priority",
        count: { $sum: 1 }
      }
    }
  ]);

  const total = await accidentModel.countDocuments();

  logger.info("Accident statistics retrieved", {
    total
  });

  return successResponse(res, {
    total,
    byStatus: statusStats,
    byPriority: priorityStats
  }, "Accident statistics fetched successfully");
});
