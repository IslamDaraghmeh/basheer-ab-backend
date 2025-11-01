import { SMSModel } from "#db/models/SMS.model.js";
import {
  sendSingleSMS as sendSingleSMSService,
  sendBulkSMS as sendBulkSMSService,
  testSMSConfiguration,
  getSMSServiceStatus,
} from "#services/smsService.js";
import { v4 as uuidv4 } from "uuid";
import { asyncHandler } from "#utils/asyncHandler.js";
import { logAudit } from "#utils/auditLogger.js";
import {
  successResponse,
  notFoundResponse,
  badRequestResponse
} from "#utils/apiResponse.js";
import logger from "#utils/logService.js";

// Send single SMS
export const sendSMS = asyncHandler(async (req, res) => {
  const { phoneNumber, message, dlr } = req.body;

  if (!phoneNumber || !message) {
    return badRequestResponse(res, "Phone number and message are required");
  }

  try {
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

    return successResponse(res, {
      sms: {
        id: sms._id,
        phoneNumber: sms.phoneNumber,
        messageId: result.messageId,
        status: result.status,
        sentDate: sms.sentDate,
      }
    }, "SMS sent successfully");
  } catch (error) {
    logger.error("Error sending SMS:", error);

    // Save failed SMS to database
    try {
      const failedSMS = new SMSModel({
        phoneNumber,
        message,
        status: "failed",
        errorMessage: error.message,
        isBulk: false,
      });
      await failedSMS.save();
    } catch (dbError) {
      logger.error("Error saving failed SMS to database:", dbError);
    }

    return badRequestResponse(res, "Failed to send SMS", error.message);
  }
});

// Send bulk SMS
export const sendBulkSMS = asyncHandler(async (req, res) => {
  const { recipients, message } = req.body;

  if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
    return badRequestResponse(res, "Recipients array is required and must not be empty");
  }

  if (!message) {
    return badRequestResponse(res, "Message is required");
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

  return successResponse(res, {
    bulkBatchId,
    summary: {
      total: result.total,
      successful: result.successful,
      failed: result.failed,
    },
    results: result.results
  }, "Bulk SMS process completed");
});

// Test SMS configuration
export const testSMS = asyncHandler(async (req, res) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return badRequestResponse(res, "Phone number is required for testing");
  }

  const result = await testSMSConfiguration(phoneNumber);

  if (result.success) {
    return successResponse(res, { result: result.result }, result.message);
  } else {
    return badRequestResponse(res, result.message, result.error);
  }
});

// Get SMS service status
export const getStatus = asyncHandler(async (req, res) => {
  const status = getSMSServiceStatus();
  return successResponse(res, { status }, "SMS service status retrieved");
});

// Get all SMS records with pagination
export const list = asyncHandler(async (req, res) => {
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

  return successResponse(res, {
    smsRecords,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }, "SMS records fetched successfully");
});

// Get SMS by ID
export const getSMSById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const sms = await SMSModel.findById(id);

  if (!sms) {
    return notFoundResponse(res, "SMS");
  }

  return successResponse(res, { sms }, "SMS fetched successfully");
});

// Delete SMS
export const deleteSMS = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const deleted = await SMSModel.findByIdAndDelete(id);

  if (!deleted) {
    return notFoundResponse(res, "SMS");
  }

  return successResponse(res, null, "SMS deleted successfully");
});

// Get SMS statistics
export const getSMSStats = asyncHandler(async (req, res) => {
  const totalSMS = await SMSModel.countDocuments();
  const sentSMS = await SMSModel.countDocuments({ status: "sent" });
  const failedSMS = await SMSModel.countDocuments({ status: "failed" });
  const pendingSMS = await SMSModel.countDocuments({ status: "pending" });
  const bulkSMS = await SMSModel.countDocuments({ isBulk: true });

  return successResponse(res, {
    stats: {
      total: totalSMS,
      sent: sentSMS,
      failed: failedSMS,
      pending: pendingSMS,
      bulk: bulkSMS,
      successRate: totalSMS > 0 ? ((sentSMS / totalSMS) * 100).toFixed(2) : 0,
    }
  }, "SMS statistics fetched successfully");
});
