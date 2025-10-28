import { SMSModel } from "../../../../DB/models/SMS.model.js";
import {
  sendSingleSMS as sendSingleSMSService,
  sendBulkSMS as sendBulkSMSService,
  testSMSConfiguration,
  getSMSServiceStatus,
} from "../../../services/smsService.js";
import { v4 as uuidv4 } from "uuid";

// Send single SMS
export const sendSMS = async (req, res, next) => {
  try {
    const { phoneNumber, message, dlr } = req.body;

    if (!phoneNumber || !message) {
      return res.status(400).json({
        message: "Phone number and message are required",
      });
    }

    // Send SMS
    const result = await sendSingleSMSService(phoneNumber, message, dlr);

    // Save to database
    const sms = new SMSModel({
      phoneNumber,
      message,
      messageId: result.messageId,
      status: result.status,
      dlr: dlr || "",
      sentDate: new Date(),
      isBulk: false,
    });
    await sms.save();

    res.status(200).json({
      message: "SMS sent successfully",
      sms: {
        id: sms._id,
        phoneNumber: sms.phoneNumber,
        messageId: result.messageId,
        status: result.status,
        sentDate: sms.sentDate,
      },
    });
  } catch (error) {
    console.error("Error sending SMS:", error);

    // Save failed SMS to database
    try {
      const failedSMS = new SMSModel({
        phoneNumber: req.body.phoneNumber,
        message: req.body.message,
        status: "failed",
        errorMessage: error.message,
        isBulk: false,
      });
      await failedSMS.save();
    } catch (dbError) {
      console.error("Error saving failed SMS to database:", dbError);
    }

    res.status(500).json({
      message: "Failed to send SMS",
      error: error.message,
    });
  }
};

// Send bulk SMS
export const sendBulkSMS = async (req, res, next) => {
  try {
    const { recipients, message } = req.body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        message: "Recipients array is required and must not be empty",
      });
    }

    if (!message) {
      return res.status(400).json({
        message: "Message is required",
      });
    }

    // Generate batch ID for this bulk send
    const bulkBatchId = uuidv4();

    // Send bulk SMS
    const result = await sendBulkSMSService(recipients, message);

    // Save all SMS records to database
    const smsRecords = result.results.map((r) => ({
      phoneNumber: r.phoneNumber,
      message: message,
      messageId: r.messageId || "",
      status: r.status,
      errorMessage: r.error || "",
      sentDate: r.success ? new Date() : null,
      isBulk: true,
      bulkBatchId: bulkBatchId,
    }));

    await SMSModel.insertMany(smsRecords);

    res.status(200).json({
      message: "Bulk SMS process completed",
      bulkBatchId: bulkBatchId,
      summary: {
        total: result.total,
        successful: result.successful,
        failed: result.failed,
      },
      results: result.results,
    });
  } catch (error) {
    console.error("Error sending bulk SMS:", error);
    res.status(500).json({
      message: "Failed to send bulk SMS",
      error: error.message,
    });
  }
};

// Test SMS configuration
export const testSMS = async (req, res, next) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        message: "Phone number is required for testing",
      });
    }

    const result = await testSMSConfiguration(phoneNumber);

    if (result.success) {
      res.status(200).json({
        message: result.message,
        result: result.result,
      });
    } else {
      res.status(500).json({
        message: result.message,
        error: result.error,
      });
    }
  } catch (error) {
    console.error("Error testing SMS configuration:", error);
    res.status(500).json({
      message: "Failed to test SMS configuration",
      error: error.message,
    });
  }
};

// Get SMS service status
export const getStatus = async (req, res, next) => {
  try {
    const status = getSMSServiceStatus();
    res.status(200).json({
      message: "SMS service status retrieved",
      status,
    });
  } catch (error) {
    console.error("Error getting SMS service status:", error);
    res.status(500).json({
      message: "Failed to get SMS service status",
      error: error.message,
    });
  }
};

// Get all SMS records with pagination
export const getAllSMS = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status; // filter by status
    const bulkBatchId = req.query.bulkBatchId; // filter by bulk batch

    const filter = {};
    if (status) {
      filter.status = status;
    }
    if (bulkBatchId) {
      filter.bulkBatchId = bulkBatchId;
    }

    const total = await SMSModel.countDocuments(filter);
    const smsRecords = await SMSModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    res.status(200).json({
      message: "SMS records fetched successfully",
      smsRecords,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching SMS records:", error);
    next(error);
  }
};

// Get SMS by ID
export const getSMSById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const sms = await SMSModel.findById(id);

    if (!sms) {
      return res.status(404).json({ message: "SMS not found" });
    }

    res.status(200).json({
      message: "SMS fetched successfully",
      sms,
    });
  } catch (error) {
    console.error("Error fetching SMS:", error);
    next(error);
  }
};

// Delete SMS
export const deleteSMS = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await SMSModel.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "SMS not found" });
    }

    res.status(200).json({ message: "SMS deleted successfully" });
  } catch (error) {
    console.error("Error deleting SMS:", error);
    next(error);
  }
};

// Get SMS statistics
export const getSMSStats = async (req, res, next) => {
  try {
    const totalSMS = await SMSModel.countDocuments();
    const sentSMS = await SMSModel.countDocuments({ status: "sent" });
    const failedSMS = await SMSModel.countDocuments({ status: "failed" });
    const pendingSMS = await SMSModel.countDocuments({ status: "pending" });
    const bulkSMS = await SMSModel.countDocuments({ isBulk: true });

    res.status(200).json({
      message: "SMS statistics fetched successfully",
      stats: {
        total: totalSMS,
        sent: sentSMS,
        failed: failedSMS,
        pending: pendingSMS,
        bulk: bulkSMS,
        successRate: totalSMS > 0 ? ((sentSMS / totalSMS) * 100).toFixed(2) : 0,
      },
    });
  } catch (error) {
    console.error("Error fetching SMS statistics:", error);
    next(error);
  }
};
