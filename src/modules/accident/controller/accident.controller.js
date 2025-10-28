import { accidentModel } from "../../../../DB/models/Accident.model.js";
import { AccidentCommentModel } from "../../../../DB/models/AccidentComment.model.js";
import cloudinary from "../../../services/cloudinary.js";
import { insuredModel } from '../../../../DB/models/Insured.model.js';
import { userModel } from "../../../../DB/models/User.model.js";
import AuditLogModel from "../../../../DB/models/AuditLog.model.js";
import { sendNotificationLogic } from "../../notification/controller/notification.controller.js";

const logAudit = async ({ userId, action, entity, entityId, userName, oldValue = null, newValue = null }) => {
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
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
};



export const addAccident = async (req, res, next) => {
  try {
    const { insuredId, vehicleId } = req.params;
    const { notes, description, title, priority } = req.body;

    // Support both notes (old) and description (new)
    const accidentDescription = description || notes;

    if (!insuredId || !vehicleId || !accidentDescription) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const insured = await insuredModel.findById(insuredId);
    if (!insured) {
      return res.status(404).json({ message: "Insured not found" });
    }

    const vehicle = insured.vehicles.id(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found for this insured" });
    }

    let uploadedImages = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: "accidents",
        });
        uploadedImages.push(result.secure_url);
      }
    }

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

    const user = await userModel.findById(req.user._id);
    const message = `${user.name} created accident ticket ${savedAccident.ticketNumber}`;

    await sendNotificationLogic({
      senderId: req.user._id,
      message
    });

    await logAudit({
      userId: req.user._id,
      userName: user.name,
      action: `Create Accident Ticket by ${user.name}`,
      entity: "Accident",
      entityId: savedAccident._id,
      newValue: savedAccident
    });

    return res.status(201).json({
      message: "Accident ticket created successfully",
      accident: savedAccident
    });

  } catch (error) {
    next(error);
  }
};

export const getAccidents = async (req, res, next) => {
  try {
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
      return res.status(404).json({ message: "No accidents found" });
    }

    return res.status(200).json({
      message: "Accident tickets fetched successfully",
      count: accidents.length,
      accidents
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get all accidents with pagination
 * GET /api/v1/accident/all?page=1&limit=10&status=open&priority=high&search=keyword
 */
export const getAllAccidentsWithPagination = async (req, res, next) => {
  try {
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

    return res.status(200).json({
      message: "Accidents fetched successfully",
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(total / limitNum),
        totalItems: total,
        itemsPerPage: limitNum,
        hasNextPage: pageNum < Math.ceil(total / limitNum),
        hasPrevPage: pageNum > 1
      },
      accidents
    });

  } catch (error) {
    next(error);
  }
};
export const deleteAccident = async (req, res, next) => {
  try {
    const { id } = req.params;

    const accident = await accidentModel.findById(id);
    if (!accident) {
      return res.status(404).json({ message: "Accident not found" });
    }

    await accidentModel.findByIdAndDelete(id);

    return res.status(200).json({ message: "Accident deleted successfully" });

  } catch (error) {
    next(error);
  }
};



export const totalAccidents = async (req, res, next) => {
  try {
    const count = await accidentModel.countDocuments();
    return res.status(200).json({ message: "Total accidents count", total: count });
  } catch (error) {
    next(error);
  }
};

export const updateAccident = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;


    const accident = await accidentModel.findById(id);
    if (!accident) {
      return res.status(404).json({ message: "Accident not found" });
    }


    if (notes) accident.notes = notes;


    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await cloudinary.uploader.upload(file.path, {
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

    return res.status(200).json({
      message: "Accident updated successfully",
      accident: updatedAccident,
    });

  } catch (error) {
    next(error);
  }
};


export const accidentReport = async (req, res, next) => {
  try {
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

    return res.status(200).json({
      message: "Accident report fetched successfully",
      totalAccidents: accidents.length,
      accidents,
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Update accident status
 * PATCH /api/v1/accident/status/:id
 */
export const updateAccidentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, comment } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const validStatuses = ["open", "in_progress", "pending_review", "resolved", "closed"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const accident = await accidentModel.findById(id);
    if (!accident) {
      return res.status(404).json({ message: "Accident not found" });
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

    return res.status(200).json({
      message: "Accident status updated successfully",
      accident: updatedAccident
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Assign accident to a user
 * PATCH /api/v1/accident/assign/:id
 */
export const assignAccident = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const accident = await accidentModel.findById(id);
    if (!accident) {
      return res.status(404).json({ message: "Accident not found" });
    }

    const assignedUser = await userModel.findById(userId);
    if (!assignedUser) {
      return res.status(404).json({ message: "User not found" });
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

    return res.status(200).json({
      message: "Accident assigned successfully",
      accident: updatedAccident
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Add comment/reply to accident
 * POST /api/v1/accident/comment/:accidentId
 */
export const addComment = async (req, res, next) => {
  try {
    const { accidentId } = req.params;
    const { comment, isInternal } = req.body;

    if (!comment) {
      return res.status(400).json({ message: "Comment is required" });
    }

    const accident = await accidentModel.findById(accidentId);
    if (!accident) {
      return res.status(404).json({ message: "Accident not found" });
    }

    let uploadedImages = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await cloudinary.uploader.upload(file.path, {
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

    return res.status(201).json({
      message: "Comment added successfully",
      comment: savedComment
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get all comments for an accident
 * GET /api/v1/accident/comments/:accidentId
 */
export const getComments = async (req, res, next) => {
  try {
    const { accidentId } = req.params;
    const { includeInternal } = req.query;

    const accident = await accidentModel.findById(accidentId);
    if (!accident) {
      return res.status(404).json({ message: "Accident not found" });
    }

    let filter = { accident: accidentId };

    // Only show internal comments to staff
    if (includeInternal !== 'true') {
      filter.isInternal = false;
    }

    const comments = await AccidentCommentModel.find(filter)
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Comments fetched successfully",
      count: comments.length,
      comments
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get accident by ticket number
 * GET /api/v1/accident/ticket/:ticketNumber
 */
export const getAccidentByTicketNumber = async (req, res, next) => {
  try {
    const { ticketNumber } = req.params;

    const accident = await accidentModel.findOne({ ticketNumber })
      .populate("insured", "first_name last_name id_Number phone_number")
      .populate("assignedTo", "name email")
      .populate({
        path: 'statusHistory.changedBy',
        select: 'name email'
      });

    if (!accident) {
      return res.status(404).json({ message: "Accident ticket not found" });
    }

    // Get comments count
    const commentsCount = await AccidentCommentModel.countDocuments({ accident: accident._id });

    return res.status(200).json({
      message: "Accident ticket fetched successfully",
      accident,
      commentsCount
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get accident statistics
 * GET /api/v1/accident/stats
 */
export const getAccidentStats = async (req, res, next) => {
  try {
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

    return res.status(200).json({
      message: "Accident statistics fetched successfully",
      total,
      byStatus: statusStats,
      byPriority: priorityStats
    });

  } catch (error) {
    next(error);
  }
};
