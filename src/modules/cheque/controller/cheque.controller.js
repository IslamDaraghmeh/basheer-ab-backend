import ChequeModel from "../../../../DB/models/Cheque.model.js";
import { insuredModel } from "../../../../DB/models/Insured.model.js";
import { userModel } from "../../../../DB/models/user.model.js";
import cloudinary from "../../../services/cloudinary.js";
import logger from "../../../utils/logService.js";
import { getPaginationParams, buildPaginatedResponse } from "../../../utils/pagination.js";
import { sendNotificationLogic } from "../../notification/controller/notification.controller.js";
import mongoose from "mongoose";

/**
 * Add a new cheque for a customer (general cheque, not tied to insurance)
 */
export const addCheque = async (req, res, next) => {
  const { customerId } = req.params;
  const { chequeNumber, chequeDate, amount, notes } = req.body;

  try {
    // Find customer
    const insured = await insuredModel.findById(customerId);

    if (!insured) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // Upload cheque image if provided
    let chequeImageUrl = null;
    if (req.file) {
      const { secure_url } = await cloudinary.uploader.upload(req.file.path, {
        folder: "Cheques",
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

    // Send notification
    const findUser = await userModel.findById(req.user._id);
    const message = `${findUser.name} added new cheque #${chequeNumber} for ${insured.first_name} ${insured.last_name}`;
    await sendNotificationLogic({
      senderId: req.user._id,
      message
    });

    return res.status(201).json({
      message: "Cheque added successfully",
      cheque: savedCheque
    });

  } catch (error) {
    logger.error("Error adding cheque:", error);
    next(error);
  }
};

/**
 * Get all cheques with filters
 */
export const getAllCheques = async (req, res, next) => {
  try {
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

    return res.status(200).json({
      message: "Cheques retrieved successfully",
      timestamp: new Date().toISOString(),
      filters: { startDate, endDate, status, customerId },
      summary,
      ...response
    });

  } catch (error) {
    logger.error("Error getting all cheques:", error);
    next(error);
  }
};

/**
 * Get single cheque by ID
 */
export const getChequeById = async (req, res, next) => {
  try {
    const { chequeId } = req.params;

    const cheque = await ChequeModel.findById(chequeId)
      .populate("createdBy", "name email");

    if (!cheque) {
      return res.status(404).json({ message: "Cheque not found" });
    }

    // Get insurance details
    const insured = await insuredModel.findById(cheque.customer.insuredId);
    const vehicle = insured?.vehicles.id(cheque.vehicleId);
    const insurance = vehicle?.insurance.id(cheque.insuranceId);

    return res.status(200).json({
      message: "Cheque retrieved successfully",
      cheque,
      insuranceDetails: insurance ? {
        insuranceCompany: insurance.insuranceCompany,
        insuranceType: insurance.insuranceType,
        insuranceStartDate: insurance.insuranceStartDate,
        insuranceEndDate: insurance.insuranceEndDate,
        vehiclePlateNumber: vehicle.plateNumber,
        vehicleModel: vehicle.model
      } : null
    });

  } catch (error) {
    logger.error("Error getting cheque by ID:", error);
    next(error);
  }
};

/**
 * Update cheque status
 */
export const updateChequeStatus = async (req, res, next) => {
  const { chequeId } = req.params;
  const { status, notes, returnedReason } = req.body;

  try {
    const cheque = await ChequeModel.findById(chequeId);
    if (!cheque) {
      return res.status(404).json({ message: "Cheque not found" });
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

    // Send notification
    const findUser = await userModel.findById(req.user._id);
    const message = `${findUser.name} updated cheque #${cheque.chequeNumber} status from ${oldStatus} to ${status}`;
    await sendNotificationLogic({
      senderId: req.user._id,
      message
    });

    return res.status(200).json({
      message: "Cheque status updated successfully",
      cheque
    });

  } catch (error) {
    logger.error("Error updating cheque status:", error);
    next(error);
  }
};

/**
 * Delete cheque
 */
export const deleteCheque = async (req, res, next) => {
  const { chequeId } = req.params;

  try {
    const cheque = await ChequeModel.findById(chequeId);
    if (!cheque) {
      return res.status(404).json({ message: "Cheque not found" });
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

    // Send notification
    const findUser = await userModel.findById(req.user._id);
    const message = `${findUser.name} deleted cheque #${cheque.chequeNumber}`;
    await sendNotificationLogic({
      senderId: req.user._id,
      message
    });

    return res.status(200).json({
      message: "Cheque deleted successfully",
      deletedCheque: cheque
    });

  } catch (error) {
    logger.error("Error deleting cheque:", error);
    next(error);
  }
};

/**
 * Get cheques for specific customer
 */
export const getCustomerCheques = async (req, res, next) => {
  try {
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

    return res.status(200).json({
      message: "Customer cheques retrieved successfully",
      cheques,
      summary
    });

  } catch (error) {
    logger.error("Error getting customer cheques:", error);
    next(error);
  }
};

/**
 * Get cheque statistics
 */
export const getChequeStatistics = async (req, res, next) => {
  try {
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

    return res.status(200).json({
      message: "Cheque statistics retrieved successfully",
      statistics: summary
    });

  } catch (error) {
    logger.error("Error getting cheque statistics:", error);
    next(error);
  }
};

/**
 * Add a cheque to an insurance payment
 */
export const addChequeToInsurance = async (req, res, next) => {
  const { insuranceId } = req.params;
  const { chequeNumber, chequeDate, amount, notes } = req.body;

  try {
    // Find insured customer with the insurance
    const insured = await insuredModel.findOne({
      "vehicles.insurance._id": insuranceId
    });

    if (!insured) {
      return res.status(404).json({ message: "Insurance not found" });
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
      return res.status(404).json({ message: "Insurance not found" });
    }

    // Upload cheque image if provided
    let chequeImageUrl = null;
    if (req.file) {
      const { secure_url } = await cloudinary.uploader.upload(req.file.path, {
        folder: "Cheques",
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

    // Send notification
    const findUser = await userModel.findById(req.user._id);
    const message = `${findUser.name} added cheque #${chequeNumber} for insurance payment - ${insured.first_name} ${insured.last_name}`;
    await sendNotificationLogic({
      senderId: req.user._id,
      message
    });

    return res.status(201).json({
      message: "Cheque added to insurance successfully",
      cheque: savedCheque
    });

  } catch (error) {
    logger.error("Error adding cheque to insurance:", error);
    next(error);
  }
};
