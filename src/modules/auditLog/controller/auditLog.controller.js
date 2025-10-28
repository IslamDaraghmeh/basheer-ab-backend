import AuditLogModel from "../../../../DB/models/AuditLog.model.js";

export const findAllAuditLogs = async (req, res) => {
  try {
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

    return res.status(200).json({
      message: "Audit logs retrieved successfully",
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return res.status(500).json({ message: "An error occurred while fetching audit logs." });
  }
};
