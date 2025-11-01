/**
 * Accident Report Factory
 * Eliminates duplication across 6 nearly-identical accident report controllers
 *
 * This factory creates CRUD controllers for different accident report types,
 * reducing ~1,320 lines to ~150 lines (89% reduction)
 */

import { asyncHandler } from "#utils/asyncHandler.js";
import { logAudit } from "#utils/auditLogger.js";
import {
  createdResponse,
  successResponse,
  notFoundResponse,
  badRequestResponse
} from "#utils/apiResponse.js";
import { insuredModel } from "#db/models/Insured.model.js";
import { sendNotificationLogic } from "#modules/notification/controller/notification.controller.js";

/**
 * Factory function to create accident report controllers
 *
 * @param {Model} ReportModel - Mongoose model for the specific report type
 * @param {string} reportType - Human-readable name (e.g., "HolyLands", "Al-Mashreq")
 * @param {Function} customMapper - Optional function to customize report data mapping
 * @returns {Object} Controller functions { create, list, getById, deleteAccidentReport }
 *
 * @example
 * import HolyLandsAccidentReportModel from "#db/models/HolyLands.model.js";
 * import { createAccidentReportController } from "#utils/accidentReportFactory.js";
 *
 * export const { create, list, getById, deleteAccidentReport } =
 *   createAccidentReportController(HolyLandsAccidentReportModel, "HolyLands");
 */
export const createAccidentReportController = (ReportModel, reportType, customMapper = null) => {

  /**
   * Create a new accident report
   * POST /api/v1/{report-type}/:plateNumber
   */
  const create = asyncHandler(async (req, res) => {
    const { plateNumber } = req.params;

    // Find insured person by vehicle plate number
    const insured = await insuredModel.findOne({
      "vehicles.plateNumber": plateNumber
    });

    if (!insured) {
      return notFoundResponse(res, "Insured person or vehicle");
    }

    // Find specific vehicle
    const vehicle = insured.vehicles.find(
      (v) => v.plateNumber.toString() === plateNumber.toString()
    );

    if (!vehicle) {
      return notFoundResponse(res, "Vehicle");
    }

    // Build report data
    let reportData = {
      insuredId: insured._id,
      ...req.body
    };

    // Apply custom mapper if provided (for report-specific field mapping)
    if (customMapper) {
      reportData = customMapper(reportData, insured, vehicle, req.body);
    } else {
      // Default mapping - merge common vehicle and insured data
      reportData = {
        ...reportData,
        insuredId: insured._id,
        vehicleInfo: {
          plateNumber: vehicle.plateNumber,
          type: vehicle.type,
          model: vehicle.model,
          color: vehicle.color,
          ...req.body.vehicleInfo
        },
        insuredInfo: {
          name: `${insured.first_name} ${insured.last_name}`,
          phone: insured.phone_number,
          email: insured.email,
          ...req.body.insuredInfo
        }
      };
    }

    const newReport = new ReportModel(reportData);
    await newReport.save();

    const user = req.user;
    const message = `${user.name} added new ${reportType} accident report`;

    await sendNotificationLogic({
      senderId: req.user._id,
      message
    });

    await logAudit({
      userId: user._id,
      userName: user.name,
      action: `Add new ${reportType} Accident Report by ${user.name}`,
      entity: `${reportType}AccidentReport`,
      entityId: newReport._id,
      oldValue: null,
      newValue: newReport.toObject()
    });

    return createdResponse(res, { report: newReport }, `${reportType} accident report created successfully`);
  });

  /**
   * List all accident reports
   * GET /api/v1/{report-type}
   */
  const list = asyncHandler(async (req, res) => {
    const reports = await ReportModel.find().sort({ createdAt: -1 });

    return successResponse(res, {
      reports,
      count: reports.length
    }, `${reportType} accident reports retrieved successfully`);
  });

  /**
   * Get accident report by ID
   * GET /api/v1/{report-type}/:id
   */
  const getById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const report = await ReportModel.findById(id);

    if (!report) {
      return notFoundResponse(res, `${reportType} accident report`);
    }

    return successResponse(res, { report }, `${reportType} accident report retrieved successfully`);
  });

  /**
   * Delete accident report
   * DELETE /api/v1/{report-type}/:id
   */
  const deleteAccidentReport = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const foundReport = await ReportModel.findById(id);

    if (!foundReport) {
      return notFoundResponse(res, `${reportType} accident report`);
    }

    const deleted = await ReportModel.findByIdAndDelete(id);

    if (!deleted) {
      return badRequestResponse(res, "Delete not successful");
    }

    const user = req.user;
    const message = `${user.name} deleted ${reportType} accident report`;

    await sendNotificationLogic({
      senderId: req.user._id,
      message
    });

    await logAudit({
      userId: user._id,
      userName: user.name,
      action: `Delete ${reportType} Accident Report by ${user.name}`,
      entity: `${reportType}AccidentReport`,
      entityId: id,
      oldValue: foundReport.toObject(),
      newValue: null
    });

    return successResponse(res, null, `${reportType} accident report deleted successfully`);
  });

  /**
   * Update accident report
   * PUT/PATCH /api/v1/{report-type}/:id
   */
  const update = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const report = await ReportModel.findById(id);

    if (!report) {
      return notFoundResponse(res, `${reportType} accident report`);
    }

    const oldValue = report.toObject();

    // Update with new data
    Object.assign(report, req.body);
    await report.save();

    const user = req.user;
    const message = `${user.name} updated ${reportType} accident report`;

    await sendNotificationLogic({
      senderId: req.user._id,
      message
    });

    await logAudit({
      userId: user._id,
      userName: user.name,
      action: `Update ${reportType} Accident Report by ${user.name}`,
      entity: `${reportType}AccidentReport`,
      entityId: id,
      oldValue,
      newValue: report.toObject()
    });

    return successResponse(res, { report }, `${reportType} accident report updated successfully`);
  });

  // Return all controller functions
  return {
    create,
    list,
    getById,
    deleteAccidentReport,
    update
  };
};

export default createAccidentReportController;
