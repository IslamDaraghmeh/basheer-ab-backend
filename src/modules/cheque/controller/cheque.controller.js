import ChequeModel from "#db/models/Cheque.model.js";
import { insuredModel } from "#db/models/Insured.model.js";
import { userModel } from "#db/models/User.model.js";
import { uploadToLocal } from "#utils/fileUpload.js";
import logger from "#utils/logService.js";
import { getPaginationParams, buildPaginatedResponse } from "#utils/pagination.js";
import { sendNotificationLogic } from "../../notification/controller/notification.controller.js";
import { notifyAction } from "#utils/notificationHelper.js";
import mongoose from "mongoose";
import { asyncHandler } from "#utils/asyncHandler.js";
import { logAudit } from "#utils/auditLogger.js";
import {
  successResponse,
  createdResponse,
  notFoundResponse
} from "#utils/apiResponse.js";

/**
 * Add a new cheque for a customer (general cheque, not tied to insurance)
 */
export const create = asyncHandler(async (req, res) => {
  const { customerId } = req.params;
  const { chequeNumber, chequeDate, amount, notes } = req.body;

  // Find customer
  const insured = await insuredModel.findById(customerId);

  if (!insured) {
    return notFoundResponse(res, "Customer");
  }

  // Upload cheque image if provided
  let chequeImageUrl = null;
  if (req.file) {
    const { secure_url } = await uploadToLocal(req.file.path, {
      folder: "cheques",
    });
    chequeImageUrl = secure_url;
  }

  // Create new cheque document (general cheque for customer)
  const newCheque = new ChequeModel({
    chequeNumber,
    customer: {
      insuredId: insured._id,
      name: `${insured.first_name} ${insured.last_name}`,
      idNumber: insured.id_Number,
      phoneNumber: insured.phone_number
    },
    chequeDate,
    amount,
    status: "pending",
    chequeImage: chequeImageUrl,
    notes: notes || "",
    insuranceId: null, // Not linked to insurance
    vehicleId: null,
    createdBy: req.user._id
  });

  const savedCheque = await newCheque.save();

  // Send notification using helper
  await notifyAction(
    req.user._id,
    (userName, chequeNum, customerName) => `${userName} added new cheque #${chequeNum} for ${customerName}`,
    chequeNumber,
    `${insured.first_name} ${insured.last_name}`
  );

  logger.info("Cheque created", {
    chequeNumber,
    customerId,
    amount,
    userId: req.user._id
  });

  return createdResponse(res, { cheque: savedCheque }, "Cheque added successfully");
});

/**
 * Get all cheques with filters
 */
export const list = asyncHandler(async (req, res) => {
  const { startDate, endDate, status, customerId } = req.query;
  const { page, limit, skip } = getPaginationParams(req.query);

  // Build query
  const query = {};

  if (startDate || endDate) {
    query.chequeDate = {};
    if (startDate) query.chequeDate.$gte = new Date(startDate);
    if (endDate) query.chequeDate.$lte = new Date(endDate);
  }

  if (status && status !== "all") {
    query.status = status;
  }

  if (customerId) {
    query["customer.insuredId"] = customerId;
  }

  // Get cheques with pagination
  const [cheques, total] = await Promise.all([
    ChequeModel.find(query)
      .sort({ chequeDate: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ChequeModel.countDocuments(query)
  ]);

  // Calculate summary
  const allCheques = await ChequeModel.find(query).lean();
  const summary = {
    totalCheques: allCheques.length,
    totalAmount: allCheques.reduce((sum, c) => sum + c.amount, 0),
    pendingCount: allCheques.filter(c => c.status === "pending").length,
    clearedCount: allCheques.filter(c => c.status === "cleared").length,
    returnedCount: allCheques.filter(c => c.status === "returned").length,
    cancelledCount: allCheques.filter(c => c.status === "cancelled").length
  };

  const response = buildPaginatedResponse(cheques, total, page, limit);

  logger.info("Cheques retrieved", {
    total,
    filters: { startDate, endDate, status, customerId }
  });

  return successResponse(res, {
    timestamp: new Date().toISOString(),
    filters: { startDate, endDate, status, customerId },
    summary,
    ...response
  }, "Cheques retrieved successfully");
});

/**
 * Get single cheque by ID
 */
export const getChequeById = asyncHandler(async (req, res) => {
  const { chequeId } = req.params;

  const cheque = await ChequeModel.findById(chequeId)
    .populate("createdBy", "name email");

  if (!cheque) {
    return notFoundResponse(res, "Cheque");
  }

  // Get insurance details
  const insured = await insuredModel.findById(cheque.customer.insuredId);
  const vehicle = insured?.vehicles.id(cheque.vehicleId);
  const insurance = vehicle?.insurance.id(cheque.insuranceId);

  logger.info("Cheque retrieved by ID", { chequeId });

  return successResponse(res, {
    cheque,
    insuranceDetails: insurance ? {
      insuranceCompany: insurance.insuranceCompany,
      insuranceType: insurance.insuranceType,
      insuranceStartDate: insurance.insuranceStartDate,
      insuranceEndDate: insurance.insuranceEndDate,
      vehiclePlateNumber: vehicle.plateNumber,
      vehicleModel: vehicle.model
    } : null
  }, "Cheque retrieved successfully");
});

/**
 * Update cheque status
 */
export const updateChequeStatus = asyncHandler(async (req, res) => {
  const { chequeId } = req.params;
  const { status, notes, returnedReason } = req.body;

  const cheque = await ChequeModel.findById(chequeId);
  if (!cheque) {
    return notFoundResponse(res, "Cheque");
  }

  const oldStatus = cheque.status;
  cheque.status = status;

  if (status === "returned") {
    cheque.returnedDate = new Date();
    cheque.returnedReason = returnedReason || "";
  } else if (status === "cleared") {
    cheque.clearedDate = new Date();
  }

  if (notes) {
    cheque.notes = notes;
  }

  await cheque.save();

  // Send notification using helper
  await notifyAction(
    req.user._id,
    (userName, chequeNum, oldStat, newStat) => `${userName} updated cheque #${chequeNum} status from ${oldStat} to ${newStat}`,
    cheque.chequeNumber,
    oldStatus,
    status
  );

  logger.info("Cheque status updated", {
    chequeId,
    oldStatus,
    newStatus: status,
    userId: req.user._id
  });

  return successResponse(res, { cheque }, "Cheque status updated successfully");
});

/**
 * Delete cheque
 */
export const deleteCheque = asyncHandler(async (req, res) => {
  const { chequeId } = req.params;

  const cheque = await ChequeModel.findById(chequeId);
  if (!cheque) {
    return notFoundResponse(res, "Cheque");
  }

  // If cheque is linked to insurance, update insurance amounts
  if (cheque.insuranceId && cheque.vehicleId) {
    const insured = await insuredModel.findById(cheque.customer.insuredId);
    if (insured) {
      const vehicle = insured.vehicles.id(cheque.vehicleId);
      if (vehicle) {
        const insurance = vehicle.insurance.id(cheque.insuranceId);
        if (insurance) {
          // Remove cheque reference
          insurance.cheques = insurance.cheques.filter(
            id => id.toString() !== chequeId
          );

          // Update paid amount
          insurance.paidAmount -= cheque.amount;
          insurance.remainingDebt = insurance.insuranceAmount - insurance.paidAmount;

          await insured.save();
        }
      }
    }
  }

  // Delete cheque
  await ChequeModel.findByIdAndDelete(chequeId);

  // Send notification using helper
  await notifyAction(
    req.user._id,
    (userName, chequeNum) => `${userName} deleted cheque #${chequeNum}`,
    cheque.chequeNumber
  );

  logger.info("Cheque deleted", {
    chequeId,
    chequeNumber: cheque.chequeNumber,
    amount: cheque.amount,
    userId: req.user._id
  });

  return successResponse(res, { deletedCheque: cheque }, "Cheque deleted successfully");
});

/**
 * Get cheques for specific customer
 */
export const getCustomerCheques = asyncHandler(async (req, res) => {
  const { customerId } = req.params;
  const { status } = req.query;

  const query = { "customer.insuredId": customerId };
  if (status && status !== "all") {
    query.status = status;
  }

  const cheques = await ChequeModel.find(query).sort({ chequeDate: -1 });

  const summary = {
    total: cheques.length,
    totalAmount: cheques.reduce((sum, c) => sum + c.amount, 0),
    pending: cheques.filter(c => c.status === "pending").length,
    cleared: cheques.filter(c => c.status === "cleared").length,
    returned: cheques.filter(c => c.status === "returned").length
  };

  logger.info("Customer cheques retrieved", {
    customerId,
    count: cheques.length
  });

  return successResponse(res, {
    cheques,
    summary
  }, "Customer cheques retrieved successfully");
});

/**
 * Get cheque statistics
 */
export const getChequeStatistics = asyncHandler(async (req, res) => {
  const stats = await ChequeModel.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        totalAmount: { $sum: "$amount" }
      }
    }
  ]);

  const summary = {
    totalCheques: 0,
    totalAmount: 0,
    byStatus: {}
  };

  stats.forEach(stat => {
    summary.totalCheques += stat.count;
    summary.totalAmount += stat.totalAmount;
    summary.byStatus[stat._id] = {
      count: stat.count,
      amount: stat.totalAmount
    };
  });

  logger.info("Cheque statistics retrieved", {
    totalCheques: summary.totalCheques,
    totalAmount: summary.totalAmount
  });

  return successResponse(res, { statistics: summary }, "Cheque statistics retrieved successfully");
});

/**
 * Add a cheque to an insurance payment
 */
export const createForInsurance = asyncHandler(async (req, res) => {
  const { insuranceId } = req.params;
  const { chequeNumber, chequeDate, amount, notes } = req.body;

  // Find insured customer with the insurance
  const insured = await insuredModel.findOne({
    "vehicles.insurance._id": insuranceId
  });

  if (!insured) {
    return notFoundResponse(res, "Insurance");
  }

  // Find the vehicle and insurance
  let vehicle = null;
  let insurance = null;

  for (const v of insured.vehicles) {
    const ins = v.insurance.id(insuranceId);
    if (ins) {
      vehicle = v;
      insurance = ins;
      break;
    }
  }

  if (!vehicle || !insurance) {
    return notFoundResponse(res, "Insurance");
  }

  // Upload cheque image if provided
  let chequeImageUrl = null;
  if (req.file) {
    const { secure_url } = await uploadToLocal(req.file.path, {
      folder: "cheques",
    });
    chequeImageUrl = secure_url;
  }

  // Create new cheque document linked to insurance
  const newCheque = new ChequeModel({
    chequeNumber,
    customer: {
      insuredId: insured._id,
      name: `${insured.first_name} ${insured.last_name}`,
      idNumber: insured.id_Number,
      phoneNumber: insured.phone_number
    },
    chequeDate,
    amount,
    status: "pending",
    chequeImage: chequeImageUrl,
    notes: notes || "",
    insuranceId: insurance._id,
    vehicleId: vehicle._id,
    createdBy: req.user._id
  });

  const savedCheque = await newCheque.save();

  // Add cheque reference to insurance
  insurance.cheques.push(savedCheque._id);

  // Update insurance paid amount
  insurance.paidAmount += amount;
  insurance.remainingDebt = insurance.insuranceAmount - insurance.paidAmount;

  await insured.save();

  // Send notification using helper
  await notifyAction(
    req.user._id,
    (userName, chequeNum, customerName) => `${userName} added cheque #${chequeNum} for insurance payment - ${customerName}`,
    chequeNumber,
    `${insured.first_name} ${insured.last_name}`
  );

  logger.info("Cheque created for insurance", {
    chequeNumber,
    insuranceId,
    amount,
    userId: req.user._id
  });

  return createdResponse(res, { cheque: savedCheque }, "Cheque added to insurance successfully");
});
