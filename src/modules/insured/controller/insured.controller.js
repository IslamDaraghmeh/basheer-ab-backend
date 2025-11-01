import { insuredModel } from "#db/models/Insured.model.js";
import { userModel } from "#db/models/User.model.js";
import InsuranceCompany from "#db/models/insuranceCompany.model.js";
import { InsuranceTypeModel } from "#db/models/InsuranceType.model.js";
import { ExpenseModel } from "#db/models/Expense.model.js";
import { RevenueModel } from "#db/models/Revenue.model.js";
import { accidentModel } from "#db/models/Accident.model.js";
import AgentTransactionModel from "#db/models/AgentTransaction.model.js";
import ChequeModel from "#db/models/Cheque.model.js";
import DocumentSettings from "#db/models/DocumentSettings.model.js";
import AuditLogModel from "#db/models/AuditLog.model.js";

import mongoose from "mongoose";
import axios from "axios";

// Notification services
import {
  createNotification,
  sendNotificationLogic,
} from "../../notification/controller/notification.controller.js";

// Utilities
import { uploadToLocal } from "#utils/fileUpload.js";
import { uploadMultipleFiles, uploadSingleFileWithDefault } from "#utils/fileUploadHelper.js";
import { notifyAction } from "#utils/notificationHelper.js";
import { getPaginationParams, buildPaginatedResponse, getSortParams, SORT_FIELDS } from "#utils/pagination.js";
import logger from "#utils/logService.js";
import { invalidateAllRelatedCaches } from "#utils/cacheInvalidation.js";
import { asyncHandler } from "#utils/asyncHandler.js";
import { logAudit } from "#utils/auditLogger.js";
import {
  successResponse,
  createdResponse,
  notFoundResponse,
  badRequestResponse,
  conflictResponse,
  unauthorizedResponse,
  errorResponse
} from "#utils/apiResponse.js";

// Duplicate logAudit function removed - now using centralized version from #utils/auditLogger.js

export const create = asyncHandler(async (req, res) => {
  const {
    first_name,
    last_name,
    id_Number,
    phone_number,
    joining_date,
    notes,
    vehicles,
    agentsName,
    city,
    email,
    birth_date,
  } = req.body;

  const findInsured = await insuredModel.findOne({ id_Number });
  if (findInsured) {
    return conflictResponse(res, "Customer already exists");
  }
  const defaultImageUrl = "https://th.bing.com/th/id/OIP.eUdZe6jPSNXtNAbxcswuIgHaE8?w=4245&h=2830&rs=1&pid=ImgDetMain";
  const imageUrl = await uploadSingleFileWithDefault(req.file, "insured", defaultImageUrl);

  const validVehicles =
    vehicles && vehicles.length > 0
      ? vehicles.map((vehicle) => ({
          plateNumber: vehicle.plateNumber || "unknown",
          model: vehicle.model,
          type: vehicle.type,
          ownership: vehicle.ownership,
          modelNumber: vehicle.modelNumber,
          licenseExpiry: vehicle.licenseExpiry,
          lastTest: vehicle.lastTest,
          color: vehicle.color,
          price: vehicle.price,
          image: vehicle.image || defaultImageUrl,
          insurance: vehicle.insurance || [],
        }))
      : [];

  let agent = null;
  if (agentsName) {
    agent = await userModel.findOne({ name: agentsName });
  }

  const newInsured = new insuredModel({
    first_name,
    last_name,
    city,
    id_Number,
    phone_number,
    ...(joining_date && { joining_date }),
    notes,
    image: imageUrl,
    vehicles: validVehicles,
    agentsName: agentsName || null,
    agentsId: agent ? agent._id : null,
    email,
    birth_date,
  });

  const savedInsured = await newInsured.save();

  // Send notification using helper
  await notifyAction(
    req.user._id,
    (userName, firstName, lastName) => `${userName} added new insured: ${firstName} ${lastName}`,
    first_name,
    last_name
  );

  // Log audit
  await logAudit({
    userId: req.user._id,
    action: `Add Insured by ${req.user.name}`,
    userName: req.user.name,
    entity: "Insured",
    entityId: savedInsured._id,
    oldValue: null,
    newValue: savedInsured.toObject(),
  });

  // Invalidate caches
  invalidateAllRelatedCaches().catch(err => logger.error("Cache invalidation failed:", err));

  return createdResponse(res, { savedInsured }, "Customer added successfully");
});

export const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const findInsured = await insuredModel.findById(id);
  if (!findInsured) {
    return notFoundResponse(res, "Customer");
  }

  const deletedInsured = await insuredModel.findByIdAndDelete(id);

  // Send notification using helper
  await notifyAction(
    req.user._id,
    (userName, firstName, lastName) => `${userName} deleted insured: ${firstName} ${lastName}`,
    findInsured.first_name,
    findInsured.last_name
  );

  // Log audit
  await logAudit({
    userId: req.user._id,
    action: `Delete Insured by ${req.user.name}`,
    userName: req.user.name,
    entity: "Insured",
    entityId: deletedInsured._id,
    oldValue: findInsured.toObject(),
    newValue: null,
  });

  // Invalidate caches
  invalidateAllRelatedCaches().catch(err => logger.error("Cache invalidation failed:", err));

  return successResponse(res, { deletedInsured }, "Customer deleted successfully");
});

export const count = asyncHandler(async (req, res) => {
  const total = await insuredModel.countDocuments();
  return successResponse(res, { totalCustomers: total }, "Customer count retrieved successfully");
});

/**
 * Get All Vehicle Insurances with Filters
 * @query {string} startDate - Filter by insurance start date from (optional)
 * @query {string} endDate - Filter by insurance end date to (optional)
 * @query {string} agent - Filter by agent name (optional)
 * @query {string} insuranceCompany - Filter by insurance company (optional)
 * @query {string} insuranceType - Filter by insurance type (optional)
 * @query {string} status - Filter by status: 'active', 'expired', or 'all' (default: 'all')
 * @query {number} page - Page number for pagination (optional)
 * @query {number} limit - Number of items per page (optional)
 */
export const getAllVehicleInsurances = asyncHandler(async (req, res) => {
  const {
    startDate,
    endDate,
    agent,
    insuranceCompany,
    insuranceType,
    status = 'all'
  } = req.query;
  const { page, limit, skip } = getPaginationParams(req.query);

  // Build match conditions
  const matchConditions = {};

  // Date range filter (for insurance start date)
  if (startDate || endDate) {
    matchConditions["vehicles.insurance.insuranceStartDate"] = {};
    if (startDate) {
      matchConditions["vehicles.insurance.insuranceStartDate"].$gte = new Date(startDate);
    }
    if (endDate) {
      matchConditions["vehicles.insurance.insuranceStartDate"].$lte = new Date(endDate);
    }
  }

  // Agent filter
  if (agent) {
    matchConditions["vehicles.insurance.agent"] = agent;
  }

  // Insurance company filter
  if (insuranceCompany) {
    matchConditions["vehicles.insurance.insuranceCompany"] = insuranceCompany;
  }

  // Insurance type filter
  if (insuranceType) {
    matchConditions["vehicles.insurance.insuranceType"] = insuranceType;
  }

  // Status filter (active/expired)
  if (status && status !== 'all') {
    const now = new Date();
    if (status === 'active') {
      matchConditions["vehicles.insurance.insuranceEndDate"] = { $gte: now };
    } else if (status === 'expired') {
      matchConditions["vehicles.insurance.insuranceEndDate"] = { $lt: now };
    }
  }

  const pipeline = [
    { $unwind: "$vehicles" },
    { $unwind: "$vehicles.insurance" },
    ...(Object.keys(matchConditions).length > 0 ? [{ $match: matchConditions }] : []),
    {
      $project: {
        _id: "$vehicles.insurance._id",
        insuranceStartDate: "$vehicles.insurance.insuranceStartDate",
        insuranceEndDate: "$vehicles.insurance.insuranceEndDate",
        isUnder24: "$vehicles.insurance.isUnder24",
        insuranceCategory: "$vehicles.insurance.insuranceCategory",
        insuranceType: "$vehicles.insurance.insuranceType",
        insuranceCompany: "$vehicles.insurance.insuranceCompany",
        agent: "$vehicles.insurance.agent",
        paymentMethod: "$vehicles.insurance.paymentMethod",
        insuranceAmount: "$vehicles.insurance.insuranceAmount",
        paidAmount: "$vehicles.insurance.paidAmount",
        remainingDebt: "$vehicles.insurance.remainingDebt",
        insuranceStatus: "$vehicles.insurance.insuranceStatus",
        insuranceFiles: "$vehicles.insurance.insuranceFiles",
        checkDetails: "$vehicles.insurance.checkDetails",
        insuredId: "$_id",
        insuredName: { $concat: ["$first_name", " ", "$last_name"] },
        insuredIdNumber: "$id_Number",
        insuredPhone: "$phone_number",
        vehicleId: "$vehicles._id",
        plateNumber: "$vehicles.plateNumber",
        vehicleModel: "$vehicles.model",
        vehicleType: "$vehicles.type",
        vehicleOwnership: "$vehicles.ownership",
        // Calculate if insurance is active or expired
        isActive: {
          $cond: {
            if: { $gte: ["$vehicles.insurance.insuranceEndDate", new Date()] },
            then: true,
            else: false
          }
        }
      },
    },
    { $sort: { insuranceEndDate: 1 } },
  ];

  const [allInsurances, countResult] = await Promise.all([
    insuredModel.aggregate([...pipeline, { $skip: skip }, { $limit: limit }]),
    insuredModel.aggregate([...pipeline, { $count: "total" }])
  ]);

  const total = countResult.length > 0 ? countResult[0].total : 0;
  const response = buildPaginatedResponse(allInsurances, total, page, limit);

  // Calculate summary statistics
  const summary = {
    totalInsurances: total,
    activeInsurances: allInsurances.filter(ins => ins.isActive).length,
    expiredInsurances: allInsurances.filter(ins => !ins.isActive).length,
    totalInsuranceAmount: allInsurances.reduce((sum, ins) => sum + (ins.insuranceAmount || 0), 0),
    totalPaidAmount: allInsurances.reduce((sum, ins) => sum + (ins.paidAmount || 0), 0),
    totalRemainingDebt: allInsurances.reduce((sum, ins) => sum + (ins.remainingDebt || 0), 0),
  };

  return successResponse(res, {
    timestamp: new Date().toISOString(),
    filters: {
      startDate: startDate || null,
      endDate: endDate || null,
      agent: agent || null,
      insuranceCompany: insuranceCompany || null,
      insuranceType: insuranceType || null,
      status: status || 'all'
    },
    summary,
    ...response,
    insurances: response.data
  }, "Vehicle insurances retrieved successfully");
});

export const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query);
  const sort = getSortParams(req.query, '-createdAt', SORT_FIELDS.INSURED);

  const [insuredList, total] = await Promise.all([
    insuredModel.find({}).sort(sort).skip(skip).limit(limit).lean(),
    insuredModel.countDocuments({})
  ]);

  const response = buildPaginatedResponse(insuredList, total, page, limit);
  return successResponse(res, response, "Customers retrieved successfully");
});

export const getById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const insured = await insuredModel.findById(id);
  if (!insured) {
    return notFoundResponse(res, "Customer");
  }

  return successResponse(res, { insured }, "Customer retrieved successfully");
});

/**
 * Search Customer by a single search key that matches Phone Number, Identity Number, or Vehicle Plate Number
 * @query {string} searchKey - Search value to match against phone number, identity number, or plate number
 */
export const searchCustomer = asyncHandler(async (req, res) => {
  const { searchKey } = req.query;

  // Ensure search key is provided
  if (!searchKey || !searchKey.trim()) {
    return badRequestResponse(res, "Search key is required");
  }

  const trimmedSearchKey = searchKey.trim();
  let customer = null;
  let searchedBy = null;
  let matchingVehicles = null;

  // Debug: Log search key details
  logger.info(`Searching for customer with key: "${trimmedSearchKey}", length: ${trimmedSearchKey.length}, type: ${typeof trimmedSearchKey}`);

  // Search by identity number (with type conversion)
  // Note: Schema defines id_Number as String, but DB has Numbers stored
  // Use aggregation to bypass Mongoose schema type conversion
  const idSearchAsNumber = !isNaN(trimmedSearchKey) ? Number(trimmedSearchKey) : null;

  // Use aggregation to search both string and number types
  const idResults = await insuredModel.aggregate([
    {
      $match: {
        $or: [
          { id_Number: trimmedSearchKey },
          { id_Number: String(trimmedSearchKey) },
          ...(idSearchAsNumber !== null ? [{ id_Number: idSearchAsNumber }] : [])
        ]
      }
    },
    { $limit: 1 }
  ]);

  customer = idResults.length > 0 ? idResults[0] : null;

  logger.info(`ID Search result for "${trimmedSearchKey}": ${customer ? 'FOUND' : 'NOT FOUND'}`);

  // Debug log
  if (customer) {
    logger.info(`Found customer by id_Number. Customer id_Number: "${customer.id_Number}", type: ${typeof customer.id_Number}`);
  }

  if (customer) {
    searchedBy = "id_Number";
    return successResponse(res, {
      customer,
      searchedBy,
      searchKey: trimmedSearchKey
    }, "Customer found by identity number");
  }

  // Search by phone number (with type conversion)
  const phoneSearchAsNumber = !isNaN(trimmedSearchKey) ? Number(trimmedSearchKey) : null;

  // Use aggregation to search both string and number types
  const phoneResults = await insuredModel.aggregate([
    {
      $match: {
        $or: [
          { phone_number: trimmedSearchKey },
          { phone_number: String(trimmedSearchKey) },
          ...(phoneSearchAsNumber !== null ? [{ phone_number: phoneSearchAsNumber }] : [])
        ]
      }
    },
    { $limit: 1 }
  ]);

  customer = phoneResults.length > 0 ? phoneResults[0] : null;

  if (customer) {
    logger.info(`Found customer by phone_number. Customer phone: "${customer.phone_number}", type: ${typeof customer.phone_number}`);
    searchedBy = "phone_number";
    return successResponse(res, {
      customer,
      searchedBy,
      searchKey: trimmedSearchKey
    }, "Customer found by phone number");
  }

  // Search by vehicle plate number (with type conversion - exact match)
  const searchAsNumber = !isNaN(trimmedSearchKey) ? Number(trimmedSearchKey) : null;

  // Use aggregation to search both string and number types
  const plateResults = await insuredModel.aggregate([
    {
      $match: {
        $or: [
          { "vehicles.plateNumber": trimmedSearchKey },
          { "vehicles.plateNumber": String(trimmedSearchKey) },
          ...(searchAsNumber !== null ? [{ "vehicles.plateNumber": searchAsNumber }] : [])
        ]
      }
    },
    { $limit: 1 }
  ]);

  customer = plateResults.length > 0 ? plateResults[0] : null;

  if (customer) {
    logger.info(`Found customer by plateNumber (exact match).`);
    searchedBy = "plateNumber";
    // Filter to show only the matching vehicle(s)
    matchingVehicles = customer.vehicles.filter(
      v => v.plateNumber && String(v.plateNumber) === String(trimmedSearchKey)
    );

    return successResponse(res, {
      customer,
      matchingVehicles,
      searchedBy,
      searchKey: trimmedSearchKey
    }, "Customer found by vehicle plate number");
  }

  // If no exact match, try partial match on plate number (contains)
  // For numeric searches, we also check if the plate number (as string) contains the search key
  const plateNumberAsNumber = !isNaN(trimmedSearchKey) ? Number(trimmedSearchKey) : null;

  // Find customers where any vehicle's plate number contains the search key
  const allCustomers = await insuredModel.find({
    'vehicles.0': { $exists: true }
  }).lean();

  customer = allCustomers.find(c => {
    return c.vehicles && c.vehicles.some(v => {
      const plateStr = String(v.plateNumber);
      return plateStr.includes(trimmedSearchKey);
    });
  });

  if (customer) {
    logger.info(`Found customer by plateNumber (partial match).`);
    searchedBy = "plateNumber_partial";
    // Filter to show only the matching vehicle(s)
    matchingVehicles = customer.vehicles.filter(
      v => {
        const plateStr = String(v.plateNumber);
        return plateStr.includes(trimmedSearchKey);
      }
    );

    return successResponse(res, {
      customer,
      matchingVehicles,
      searchedBy,
      searchKey: trimmedSearchKey
    }, "Customer found by vehicle plate number (partial match)");
  }

  // Debug: Sample some customers to see their data structure
  const sampleCustomers = await insuredModel.find({ 'vehicles.0': { $exists: true } }).limit(5).select('id_Number phone_number first_name last_name vehicles.plateNumber').lean();
  logger.info(`Sample customers in DB:`, JSON.stringify(sampleCustomers, null, 2));

  // No customer found
  return notFoundResponse(res, "Customer with the provided search key");
});

export const getTotalInsuredCount = asyncHandler(async (req, res) => {
  const total = await insuredModel.countDocuments();
  return successResponse(res, { total }, "Total customer count retrieved successfully");
});

/**
 * Customers Overview Endpoint
 * Returns customer acquisition data by month, quarter, or year
 * @query {string} period - 'monthly', 'quarterly', or 'yearly' (default: 'monthly')
 * @query {number} year - Year to filter (default: current year)
 */
export const getCustomersOverview = asyncHandler(async (req, res) => {
  const { period = 'monthly', year } = req.query;
  const targetYear = year ? parseInt(year) : new Date().getFullYear();

  // Validate period
  if (!['monthly', 'quarterly', 'yearly'].includes(period)) {
    return badRequestResponse(res, "Invalid period. Must be 'monthly', 'quarterly', or 'yearly'");
  }

  let customersData = {};

  if (period === 'monthly') {
    // Monthly breakdown for the specified year
    const monthlyData = await insuredModel.aggregate([
      {
        $match: {
          joining_date: { $exists: true, $ne: null }
        }
      },
      {
        $project: {
          year: { $year: "$joining_date" },
          month: { $month: "$joining_date" }
        }
      },
      {
        $match: {
          year: targetYear
        }
      },
      {
        $group: {
          _id: { year: "$year", month: "$month" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.month": 1 } }
    ]);

    // Create array with all 12 months
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyResult = [];

    for (let month = 1; month <= 12; month++) {
      const data = monthlyData.find(item => item._id.month === month);
      monthlyResult.push({
        period: monthNames[month - 1],
        month: month,
        year: targetYear,
        customers: data ? data.count : 0
      });
    }

    customersData = {
      period: 'monthly',
      year: targetYear,
      data: monthlyResult,
      summary: {
        totalCustomers: monthlyResult.reduce((sum, item) => sum + item.customers, 0)
      }
    };

  } else if (period === 'quarterly') {
    // Quarterly breakdown for the specified year
    const quarterlyData = await insuredModel.aggregate([
      {
        $match: {
          joining_date: { $exists: true, $ne: null }
        }
      },
      {
        $project: {
          year: { $year: "$joining_date" },
          quarter: {
            $ceil: {
              $divide: [{ $month: "$joining_date" }, 3]
            }
          }
        }
      },
      {
        $match: {
          year: targetYear
        }
      },
      {
        $group: {
          _id: { year: "$year", quarter: "$quarter" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.quarter": 1 } }
    ]);

    // Create array with all 4 quarters
    const quarterNames = ['Q1', 'Q2', 'Q3', 'Q4'];
    const quarterlyResult = [];

    for (let quarter = 1; quarter <= 4; quarter++) {
      const data = quarterlyData.find(item => item._id.quarter === quarter);
      quarterlyResult.push({
        period: quarterNames[quarter - 1],
        quarter: quarter,
        year: targetYear,
        customers: data ? data.count : 0
      });
    }

    customersData = {
      period: 'quarterly',
      year: targetYear,
      data: quarterlyResult,
      summary: {
        totalCustomers: quarterlyResult.reduce((sum, item) => sum + item.customers, 0)
      }
    };

  } else if (period === 'yearly') {
    // Yearly breakdown (last 5 years)
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 4;

    const yearlyData = await insuredModel.aggregate([
      {
        $match: {
          joining_date: { $exists: true, $ne: null }
        }
      },
      {
        $project: {
          year: { $year: "$joining_date" }
        }
      },
      {
        $match: {
          year: { $gte: startYear, $lte: currentYear }
        }
      },
      {
        $group: {
          _id: { year: "$year" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1 } }
    ]);

    // Create array with last 5 years
    const yearlyResult = [];

    for (let year = startYear; year <= currentYear; year++) {
      const data = yearlyData.find(item => item._id.year === year);
      yearlyResult.push({
        period: year.toString(),
        year: year,
        customers: data ? data.count : 0
      });
    }

    customersData = {
      period: 'yearly',
      yearRange: `${startYear}-${currentYear}`,
      data: yearlyResult,
      summary: {
        totalCustomers: yearlyResult.reduce((sum, item) => sum + item.customers, 0)
      }
    };
  }

  return successResponse(res, {
    timestamp: new Date().toISOString(),
    ...customersData
  }, "Customers overview retrieved successfully");
});

export const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    first_name,
    last_name,
    id_Number,
    phone_number,
    joining_date,
    notes,
    city,
    birth_date,
  } = req.body;

  const insured = await insuredModel.findById(id);
  if (!insured) {
    return notFoundResponse(res, "Customer");
  }

  const oldValue = insured.toObject();

  let updatedData = {
    first_name,
    last_name,
    id_Number,
    phone_number,
    joining_date,
    notes,
    city,
    birth_date,
  };

  if (req.file) {
    const imageUrl = await uploadSingleFileWithDefault(req.file, "insured", insured.image);
    updatedData.image = imageUrl;
  }

  const updatedInsured = await insuredModel.findByIdAndUpdate(
    id,
    updatedData,
    { new: true }
  );

  // Log audit
  await logAudit({
    userId: req.user._id,
    action: `Update insured by ${req.user.name}`,
    userName: req.user.name,
    entity: "Insured",
    entityId: updatedInsured._id,
    oldValue,
    newValue: updatedInsured.toObject(),
  });

  return successResponse(res, { updatedInsured }, "Customer updated successfully");
});

export const createVehicle = asyncHandler(async (req, res) => {
  const { insuredId } = req.params;
  const {
    plateNumber,
    model,
    type,
    ownership,
    modelNumber,
    licenseExpiry,
    lastTest,
    color,
    price,
  } = req.body;

  const imageUrl = await uploadSingleFileWithDefault(req.file, "vehicles", "");

  const newVehicle = {
    plateNumber: plateNumber || "unknown",
    model,
    type,
    ownership,
    modelNumber,
    licenseExpiry,
    lastTest,
    color,
    price,
    image: imageUrl,
    insurance: [],
  };

  const insured = await insuredModel.findById(insuredId);
  if (!insured) {
    return notFoundResponse(res, "Customer");
  }

  insured.vehicles.push(newVehicle);
  await insured.save({ validateBeforeSave: false });

  // Send notification using helper
  await notifyAction(
    req.user._id,
    (userName, plate) => `${userName} added new car, plate number: ${plate}`,
    plateNumber
  );

  // Log audit
  await logAudit({
    userId: req.user._id,
    userName: req.user.name,
    action: `Added new vehicle by ${req.user.name}`,
    entity: "Vehicle",
    entityId: insuredId,
    oldValue: null,
    newValue: newVehicle,
  });

  return successResponse(res, null, "Vehicle added successfully");
});

export const deleteVehicle = asyncHandler(async (req, res) => {
  const { insuredId, vehicleId } = req.params;

  const insured = await insuredModel.findById(insuredId);
  if (!insured) {
    return notFoundResponse(res, "Customer");
  }

  const vehicleToRemove = insured.vehicles.find(
    (v) => v._id.toString() === vehicleId
  );

  if (!vehicleToRemove) {
    return notFoundResponse(res, "Vehicle");
  }

  insured.vehicles.pull({ _id: vehicleId });
  await insured.save();

  // Send notification using helper
  await notifyAction(
    req.user._id,
    (userName, plate) => `${userName} deleted vehicle with plate number: ${plate}`,
    vehicleToRemove.plateNumber
  );

  // Log audit
  await logAudit({
    userId: req.user._id,
    userName: req.user.name,
    action: `delete vehicles by ${req.user.name}`,
    entity: "Vehicle",
    entityId: insuredId,
    oldValue: vehicleToRemove,
    newValue: null,
  });

  return successResponse(res, null, "Vehicle deleted successfully");
});

export const updateVehicle = asyncHandler(async (req, res) => {
  const { insuredId, vehicleId } = req.params;
  const {
    plateNumber,
    model,
    type,
    ownership,
    modelNumber,
    licenseExpiry,
    lastTest,
    color,
    price,
  } = req.body;

  const insured = await insuredModel.findById(insuredId);
  if (!insured) {
    return notFoundResponse(res, "Customer");
  }

  const vehicle = insured.vehicles.id(vehicleId);
  if (!vehicle) {
    return notFoundResponse(res, "Vehicle");
  }

  const oldValue = { ...vehicle._doc };

  vehicle.plateNumber = plateNumber || vehicle.plateNumber;
  vehicle.model = model || vehicle.model;
  vehicle.type = type || vehicle.type;
  vehicle.ownership = ownership || vehicle.ownership;
  vehicle.modelNumber = modelNumber || vehicle.modelNumber;
  vehicle.licenseExpiry = licenseExpiry || vehicle.licenseExpiry;
  vehicle.lastTest = lastTest || vehicle.lastTest;
  vehicle.color = color || vehicle.color;
  vehicle.price = price || vehicle.price;

  await insured.save();

  const newValue = { ...vehicle._doc };

  // Log audit
  await logAudit({
    userId: req.user._id,
    userName: req.user.name,
    action: `Update vehicle by ${req.user.name}`,
    entity: "Vehicle",
    entityId: insuredId,
    oldValue,
    newValue,
  });

  return successResponse(res, null, "Vehicle updated successfully");
});

export const listVehicles = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const insured = await insuredModel.findById(id).select("vehicles");

  if (!insured) {
    return notFoundResponse(res, "Customer");
  }

  return successResponse(res, { vehicles: insured.vehicles }, "Vehicles retrieved successfully");
});

export const countVehicles = asyncHandler(async (req, res) => {
  const result = await insuredModel.aggregate([
    { $unwind: "$vehicles" },
    { $count: "totalVehicles" },
  ]);

  const total = result.length > 0 ? result[0].totalVehicles : 0;

  return successResponse(res, { totalVehicles: total }, "Vehicle count retrieved successfully");
});

export const uploadCustomerFiles = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const insured = await insuredModel.findById(id);
  if (!insured) {
    return notFoundResponse(res, "Customer");
  }

  // Upload all files using the helper
  const fileUrls = await uploadMultipleFiles(req.files, "insured");

  // Map uploaded URLs to file objects
  const uploadedFiles = req.files.map((file, index) => ({
    fileName: file.originalname,
    fileUrl: fileUrls[index],
  }));

  insured.attachments.push(...uploadedFiles);
  await insured.save();

  return successResponse(res, { attachments: insured.attachments }, "Files uploaded successfully");
});

export const deleteInsurance = asyncHandler(async (req, res) => {
  const { insuredId, vehicleId, insuranceId } = req.params;

  const insured = await insuredModel.findById(insuredId);
  if (!insured) {
    return notFoundResponse(res, "Customer");
  }

  const vehicle = insured.vehicles.id(vehicleId);
  if (!vehicle) {
    return notFoundResponse(res, "Vehicle");
  }

  const insuranceIndex = vehicle.insurance.findIndex(
    (ins) => ins._id.toString() === insuranceId
  );

  if (insuranceIndex === -1) {
    return notFoundResponse(res, "Insurance");
  }

  // Save the insurance data before removing
  const removedInsurance = vehicle.insurance[insuranceIndex].toObject();

  vehicle.insurance.splice(insuranceIndex, 1);

  await insured.save();

  const adminUser = await userModel.findOne({ role: "admin" });
  if (!adminUser) {
    return notFoundResponse(res, "Admin");
  }

  if (!req.user) {
    return unauthorizedResponse(res, "User not logged in");
  }

  const adminNotificationMessage = `The insurance for vehicle number ${vehicleId} has been deleted.`;
  await createNotification(adminUser._id, req.user._id, adminNotificationMessage);

  // Send notification using helper
  await notifyAction(
    req.user._id,
    (userName) => `${userName} deleted insurance from vehicle`,
  );

  // Log audit
  await logAudit({
    userId: req.user._id,
    userName: req.user.name,
    action: `Delete insurance by ${req.user.name}`,
    entity: "Insurance",
    entityId: vehicleId,
    oldValue: removedInsurance,
    newValue: null,
  });

  return successResponse(res, null, "Insurance deleted successfully");
});

export const createInsurance = asyncHandler(async (req, res) => {
  const { insuredId, vehicleId } = req.params;
  const {
    insuranceType,
    insuranceCompany,
    agent,
    agentId,
    agentFlow,
    agentAmount,
    paymentMethod,
    paidAmount,
    isUnder24,
    priceisOnTheCustomer,
    insuranceAmount,
    payments,
    insuranceStartDate,
    insuranceEndDate,
  } = req.body;

  const insured = await insuredModel.findById(insuredId);
  if (!insured) {
    return notFoundResponse(res, "Customer");
  }

  const vehicle = insured.vehicles.id(vehicleId);
  if (!vehicle) {
    return notFoundResponse(res, "Vehicle");
  }

  const company = await InsuranceCompany.findOne({
    name: insuranceCompany,
  }).populate("insuranceTypes", "name");
  if (!company) {
    return notFoundResponse(res, `Insurance company ${insuranceCompany}`);
  }

  // Check if the insurance type exists globally
  const insuranceTypeDoc = await InsuranceTypeModel.findOne({
    name: { $regex: new RegExp(`^${insuranceType}$`, "i") },
  });
  if (!insuranceTypeDoc) {
    return badRequestResponse(res, `Insurance type '${insuranceType}' does not exist`);
  }

  // Check if the insurance type is available for this company
  const typeAvailable = company.insuranceTypes.some(
    (t) => t._id.toString() === insuranceTypeDoc._id.toString()
  );
  if (!typeAvailable) {
    return badRequestResponse(res, `Insurance type '${insuranceType}' is not available for company '${insuranceCompany}'`);
  }

  if (!insuranceAmount || insuranceAmount <= 0) {
    return badRequestResponse(res, "Insurance amount is required and must be greater than 0");
  }

  // Use provided dates or calculate defaults
  let calculatedStartDate =
    vehicle.insurance.length > 0
      ? vehicle.insurance[vehicle.insurance.length - 1].insuranceEndDate
      : new Date();

  const finalStartDate = insuranceStartDate ? new Date(insuranceStartDate) : calculatedStartDate;

  let calculatedEndDate = new Date(finalStartDate);
  calculatedEndDate.setFullYear(calculatedEndDate.getFullYear() + 1);

  const finalEndDate = insuranceEndDate ? new Date(insuranceEndDate) : calculatedEndDate;

  // Upload files using helper
  const insuranceFilesUrls = await uploadMultipleFiles(req.files, "insurance");

  // Process payments array and create cheque records if needed
  const processedPayments = [];
  const chequeIds = [];

  if (payments && Array.isArray(payments) && payments.length > 0) {
    for (const payment of payments) {
      // Auto-generate receipt number if not provided
      let receiptNum = payment.receiptNumber;
      if (!receiptNum || receiptNum.trim() === '') {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        receiptNum = `REC-${timestamp}-${random}`;
      }

      const paymentRecord = {
        amount: payment.amount,
        paymentMethod: payment.paymentMethod,
        paymentDate: payment.paymentDate ? new Date(payment.paymentDate) : new Date(),
        notes: payment.notes || '',
        receiptNumber: receiptNum,
        recordedBy: req.user._id
      };

      // If payment is by cheque, create a Cheque document
      if (payment.paymentMethod === 'cheque' && payment.chequeNumber) {
        const chequeDoc = await ChequeModel.create({
          chequeNumber: payment.chequeNumber,
          customer: {
            insuredId: insuredId,
            name: `${insured.first_name} ${insured.last_name}`,
            idNumber: insured.id_Number,
            phoneNumber: insured.phone_number
          },
          chequeDate: payment.chequeDate ? new Date(payment.chequeDate) : new Date(),
          amount: payment.amount,
          status: payment.chequeStatus || 'pending',
          insuranceId: null, // Will be set after insurance is created
          vehicleId: vehicleId,
          notes: payment.notes || '',
          createdBy: req.user._id
        });

        paymentRecord.chequeId = chequeDoc._id;
        chequeIds.push(chequeDoc._id);
      }

      processedPayments.push(paymentRecord);
    }
  }

  const newInsurance = {
    insuranceStartDate: finalStartDate,
    insuranceEndDate: finalEndDate,
    isUnder24,
    insuranceCategory: "vehicle_insurance",
    insuranceType,
    insuranceCompany,
    agent,
    agentId,
    agentFlow: agentFlow || 'none',
    agentAmount: agentAmount || 0,
    insuranceAmount,
    payments: processedPayments,
    insuranceFiles: insuranceFilesUrls,
    priceisOnTheCustomer,
    cheques: chequeIds
  };

  vehicle.insurance.push(newInsurance);

  await insured.save({ validateBeforeSave: false });

  // Get the newly created insurance ID from the saved document
  const savedVehicle = insured.vehicles.id(vehicleId);
  const savedInsurance = savedVehicle.insurance[savedVehicle.insurance.length - 1];
  const insuranceId = savedInsurance._id;

  // Create Revenue records for each payment
  if (processedPayments.length > 0) {
    for (const payment of processedPayments) {
      await RevenueModel.create({
        title: `Insurance Payment - ${insuranceType}`,
        amount: payment.amount,
        receivedFrom: `${insured.first_name} ${insured.last_name}`,
        paymentMethod: payment.paymentMethod === 'cheque' ? 'check' : payment.paymentMethod,
        date: payment.paymentDate,
        description: payment.notes || `${payment.paymentMethod} payment for ${insuranceCompany} insurance (${insuranceType})`,
        fromVehiclePlate: savedVehicle.plateNumber
      });
    }
  }

  // Handle agent transactions if agentFlow is specified
  if (agentFlow && agentFlow !== 'none' && agentAmount > 0) {
    const transactionType = agentFlow === 'from_agent' ? 'credit' : 'debit';
    const description = agentFlow === 'from_agent'
      ? `Commission for insurance ${insuranceId}`
      : `Payment received from agent for insurance ${insuranceId}`;

    await AgentTransactionModel.create({
      agentName: agent,
      agentId: agentId,
      transactionType: transactionType,
      amount: agentAmount,
      description: description,
      insuranceCompany: insuranceCompany,
      customer: insuredId,
      vehicle: vehicleId,
      insurance: insuranceId,
      recordedBy: req.user._id
    });
  }

  // Invalidate related caches
  await invalidateAllRelatedCaches();

  // Send notification using helper
  await notifyAction(
    req.user._id,
    (userName) => `${userName} added new insurance`
  );

  // Log audit
  await logAudit({
    userId: req.user._id,
    userName: req.user.name,
    action: `Add new insurance to vehicle ${vehicleId}`,
    entity: "Insurance",
    entityId: vehicleId,
    oldValue: null,
    newValue: newInsurance,
  });

  return successResponse(res, { insurance: newInsurance }, "Insurance added successfully");
});

export const getInsurancesForVehicle = asyncHandler(async (req, res) => {
  const { insuredId, vehicleId } = req.params;
  const { status } = req.query;

  const insured = await insuredModel.findById(insuredId);
  if (!insured) {
    return notFoundResponse(res, "Customer");
  }

  const vehicle = insured.vehicles.id(vehicleId);
  if (!vehicle) {
    return notFoundResponse(res, "Vehicle");
  }

  let insurances = vehicle.insurance;

  // Filter by payment status if requested
  if (status === 'unpaid') {
    insurances = insurances.filter(ins => ins.remainingDebt > 0);
  } else if (status === 'paid') {
    insurances = insurances.filter(ins => ins.remainingDebt === 0);
  }

  // Calculate summary
  const summary = {
    total: insurances.length,
    totalAmount: insurances.reduce((sum, ins) => sum + ins.insuranceAmount, 0),
    totalPaid: insurances.reduce((sum, ins) => sum + ins.paidAmount, 0),
    totalRemaining: insurances.reduce((sum, ins) => sum + ins.remainingDebt, 0),
    fullyPaid: insurances.filter(ins => ins.remainingDebt === 0).length,
    partiallyPaid: insurances.filter(ins => ins.remainingDebt > 0 && ins.paidAmount > 0).length,
    unpaid: insurances.filter(ins => ins.paidAmount === 0).length
  };

  return successResponse(res, {
    vehicle: {
      _id: vehicle._id,
      plateNumber: vehicle.plateNumber,
      model: vehicle.model,
      type: vehicle.type
    },
    customer: {
      _id: insured._id,
      name: `${insured.first_name} ${insured.last_name}`,
      phone: insured.phone_number
    },
    summary,
    insurances
  }, "Insurances retrieved successfully");
});

// API to get all insurances for an insured (for all vehicles)
export const getAllInsurancesForInsured = asyncHandler(async (req, res) => {
  const { insuredId } = req.params;

  const insured = await insuredModel.findById(insuredId);
  if (!insured) {
    return notFoundResponse(res, "Customer");
  }

  // Collect all insurances from all vehicles
  const allInsurances = insured.vehicles.flatMap(
    (vehicle) => vehicle.insurance
  );

  return successResponse(res, { insurances: allInsurances }, "All insurances retrieved successfully");
});

export const createCheck = asyncHandler(async (req, res) => {
  const { insuredId, vehicleId, insuranceId } = req.params;
  const { checkNumber, checkDueDate, checkAmount, isReturned } = req.body;

  const insured = await insuredModel.findById(insuredId);
  if (!insured) {
    return notFoundResponse(res, "Customer");
  }

  const vehicle = insured.vehicles.id(vehicleId);
  if (!vehicle) {
    return notFoundResponse(res, "Vehicle");
  }

  const insurance = vehicle.insurance.id(insuranceId);
  if (!insurance) {
    return notFoundResponse(res, "Insurance");
  }

  const checkImageUrl = await uploadSingleFileWithDefault(req.file, "cheques", null);

  const newCheck = {
    checkNumber,
    checkDueDate,
    checkAmount,
    isReturned,
    checkImage: checkImageUrl,
  };

  insurance.checkDetails.push(newCheck);
  insurance.paidAmount += checkAmount;
  insurance.remainingDebt = insurance.insuranceAmount - insurance.paidAmount;

  await insured.save();

  // Send notification using helper
  await notifyAction(
    req.user._id,
    (userName, checkNum) => `${userName} added new check #${checkNum}`,
    checkNumber
  );

  // Log audit
  await logAudit({
    userId: req.user._id,
    userName: req.user.name,
    action: `Add check by ${req.user.name}`,
    entity: "Check",
    entityId: insuranceId,
    oldValue: null,
    newValue: {
      addedCheck: newCheck,
      paidAmount: insurance.paidAmount,
      remainingDebt: insurance.remainingDebt,
    },
  });

  return successResponse(res, { insurance }, "Check added successfully");
});

export const getInsuranceChecks = asyncHandler(async (req, res) => {
  const { insuredId, vehicleId, insuranceId } = req.params;

  const insured = await insuredModel.findById(insuredId);
  if (!insured) return notFoundResponse(res, "Insured");

  const vehicle = insured.vehicles.id(vehicleId);
  if (!vehicle) return notFoundResponse(res, "Vehicle");

  const insurance = vehicle.insurance.id(insuranceId);
  if (!insurance) return notFoundResponse(res, "Insurance");

  return successResponse(
    res,
    { checks: insurance.checkDetails },
    "Check details fetched successfully"
  );
});

export const getAllChecksForVehicle = asyncHandler(async (req, res) => {
  const { insuredId, vehicleId } = req.params;

  const insured = await insuredModel.findById(insuredId);
  if (!insured) return notFoundResponse(res, "Insured");

  const vehicle = insured.vehicles.id(vehicleId);
  if (!vehicle) return notFoundResponse(res, "Vehicle");

  let allChecks = [];

  vehicle.insurance.forEach((insurance) => {
    if (insurance.checkDetails && insurance.checkDetails.length > 0) {
      insurance.checkDetails.forEach((check) => {
        allChecks.push({
          ...check.toObject(),
          insuranceId: insurance._id,
          insuranceType: insurance.insuranceType,
          insuranceCompany: insurance.insuranceCompany,
        });
      });
    }
  });

  return successResponse(
    res,
    { checks: allChecks },
    "All checks for the vehicle retrieved successfully"
  );
});

export const deleteCheck = asyncHandler(async (req, res) => {
  const { insuredId, vehicleId, insuranceId, checkId } = req.params;

  const insured = await insuredModel.findById(insuredId);
  if (!insured) return notFoundResponse(res, "Insured");

  const vehicle = insured.vehicles.id(vehicleId);
  if (!vehicle) return notFoundResponse(res, "Vehicle");

  const insurance = vehicle.insurance.id(insuranceId);
  if (!insurance) return notFoundResponse(res, "Insurance");

  const checkIndex = insurance.checkDetails.findIndex(
    (check) => check._id.toString() === checkId
  );
  if (checkIndex === -1) return notFoundResponse(res, "Check");

  const removedCheck = insurance.checkDetails[checkIndex];
  insurance.paidAmount -= removedCheck.checkAmount;
  insurance.remainingDebt = insurance.insuranceAmount - insurance.paidAmount;

  insurance.checkDetails.splice(checkIndex, 1);
  await insured.save();

  await notifyAction(
    req.user._id,
    (userName) => `${userName} deleted check from insurance`
  );

  await logAudit({
    userId: req.user._id,
    userName: req.user.name,
    action: `Delete check by ${req.user.name}`,
    entity: "Check",
    entityId: checkId,
    oldValue: null,
    newValue: null,
  });

  return successResponse(res, {}, "Check deleted successfully");
});

export const getActiveInsurancesCount = asyncHandler(async (req, res) => {
  const result = await insuredModel.aggregate([
    { $unwind: "$vehicles" },
    { $unwind: "$vehicles.insurance" },
    {
      $match: {
        "vehicles.insurance.insuranceEndDate": { $gte: new Date() }
      }
    },
    { $count: "activeInsurances" }
  ]);

  const activeCount = result.length > 0 ? result[0].activeInsurances : 0;
  return successResponse(res, { activeInsurances: activeCount });
});

export const getExpiredInsurancesCount = asyncHandler(async (req, res) => {
  const result = await insuredModel.aggregate([
    { $unwind: "$vehicles" },
    { $unwind: "$vehicles.insurance" },
    {
      $match: {
        "vehicles.insurance.insuranceEndDate": { $lt: new Date() }
      }
    },
    { $count: "expiredInsurances" }
  ]);

  const expiredCount = result.length > 0 ? result[0].expiredInsurances : 0;
  return successResponse(res, { expiredInsurances: expiredCount });
});

export const getTotalPayments = asyncHandler(async (req, res) => {
  const result = await insuredModel.aggregate([
    { $unwind: "$vehicles" },
    { $unwind: "$vehicles.insurance" },
    {
      $group: {
        _id: null,
        totalPayments: { $sum: "$vehicles.insurance.paidAmount" }
      }
    }
  ]);

  const totalPayments = result.length > 0 ? result[0].totalPayments : 0;
  return successResponse(res, { totalPayments });
});

export const getPaymentsByMethod = asyncHandler(async (req, res) => {
  const result = await insuredModel.aggregate([
    { $unwind: "$vehicles" },
    { $unwind: "$vehicles.insurance" },
    {
      $group: {
        _id: "$vehicles.insurance.paymentMethod",
        totalAmount: { $sum: "$vehicles.insurance.paidAmount" }
      }
    }
  ]);

  let visaPayments = 0;
  let cashPayments = 0;
  let checkPayments = 0;
  let bankPayments = 0;

  result.forEach(item => {
    const method = item._id ? item._id.toLowerCase() : '';
    const amount = item.totalAmount || 0;

    if (method === "card" || method === "visa" || method === "فيزا") {
      visaPayments += amount;
    } else if (method === "cash" || method === "نقداً") {
      cashPayments += amount;
    } else if (method === "check" || method === "cheque" || method === "شيكات") {
      checkPayments += amount;
    } else if (method === "bank_transfer") {
      bankPayments += amount;
    }
  });

  return successResponse(res, {
    visaPayments,
    cashPayments,
    checkPayments,
    bankPayments,
  });
});

export const getReturnedChecksAmount = asyncHandler(async (req, res) => {
  const result = await insuredModel.aggregate([
    { $unwind: "$vehicles" },
    { $unwind: "$vehicles.insurance" },
    { $unwind: "$vehicles.insurance.checkDetails" },
    {
      $match: {
        "vehicles.insurance.checkDetails.isReturned": true
      }
    },
    {
      $group: {
        _id: null,
        returnedChecksTotal: { $sum: "$vehicles.insurance.checkDetails.checkAmount" }
      }
    }
  ]);

  const returnedChecksTotal = result.length > 0 ? result[0].returnedChecksTotal : 0;
  return successResponse(res, { returnedChecksTotal });
});

export const getDebtsByCustomer = asyncHandler(async (req, res) => {
  const customerDebts = await insuredModel.aggregate([
    { $unwind: "$vehicles" },
    { $unwind: "$vehicles.insurance" },
    {
      $group: {
        _id: "$_id",
        customer: {
          $first: { $concat: ["$first_name", " ", "$last_name"] }
        },
        totalDebt: { $sum: "$vehicles.insurance.remainingDebt" }
      }
    },
    {
      $project: {
        _id: 0,
        customer: 1,
        totalDebt: 1
      }
    },
    { $sort: { totalDebt: -1 } }
  ]);

  return successResponse(res, { customerDebts });
});

export const getPaymentsAndDebtsByAgent = asyncHandler(async (req, res) => {
  const { agentName } = req.params;

  const insureds = await insuredModel
    .find({
      "vehicles.insurance.agent": agentName,
    })
    .select("first_name last_name vehicles.insurance");

  let totalPaid = 0;
  let totalDebts = 0;
  let insuranceList = [];

  insureds.forEach((insured) => {
    insured.vehicles.forEach((vehicle) => {
      vehicle.insurance.forEach((insurance) => {
        if (insurance.agent === agentName) {
          totalPaid += insurance.paidAmount || 0;
          totalDebts += insurance.remainingDebt || 0;

          insuranceList.push({
            customer: `${insured.first_name} ${insured.last_name}`,
            insuranceCompany: insurance.insuranceCompany,
            insuranceType: insurance.insuranceType,
            insuranceAmount: insurance.insuranceAmount,
            paidAmount: insurance.paidAmount,
            remainingDebt: insurance.remainingDebt,
            paymentMethod: insurance.paymentMethod,
            insuranceStartDate: insurance.insuranceStartDate,
            insuranceEndDate: insurance.insuranceEndDate,

            summary: {
              total: insurance.insuranceAmount || 0,
              paid: insurance.paidAmount || 0,
              remaining: insurance.remainingDebt || 0,
            },
          });
        }
      });
    });
  });

  return successResponse(res, {
    agent: agentName,
    totalPaid,
    totalDebts,
    insuranceList,
  });
});

export const getCustomersReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, agentName } = req.query;
  const { page, limit, skip } = getPaginationParams(req.query);
  const sort = getSortParams(req.query, '-joining_date', SORT_FIELDS.INSURED);

  const filter = {};

  if (startDate && endDate) {
    filter.joining_date = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  if (agentName) {
    filter.agentsName = agentName;
  }

  const [customers, total] = await Promise.all([
    insuredModel
      .find(filter)
      .select("first_name last_name id_Number phone_number city email joining_date agentsName")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    insuredModel.countDocuments(filter)
  ]);

  const response = buildPaginatedResponse(customers, total, page, limit);
  return successResponse(res, {
    ...response,
    customers: response.data
  }, "Customers report");
});

export const getVehicleInsuranceReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, agent, company } = req.query;
  const { page, limit, skip } = getPaginationParams(req.query);

  const matchStage = {
    "vehicles.insurance.insuranceCategory": "vehicle_insurance",
  };

  if (startDate && endDate) {
    matchStage["vehicles.insurance.insuranceStartDate"] = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  if (agent) {
    matchStage["agentsName"] = agent;
  }

  if (company) {
    matchStage["vehicles.insurance.insuranceCompany"] = company;
  }

  const pipeline = [
    { $unwind: "$vehicles" },
    { $unwind: "$vehicles.insurance" },
    { $match: matchStage },
    {
      $project: {
        _id: 0,
        customerName: { $concat: ["$first_name", " ", "$last_name"] },
        phone_number: 1,
        agentsName: 1,
        insuranceCompany: "$vehicles.insurance.insuranceCompany",
        insuranceType: "$vehicles.insurance.insuranceType",
        insuranceStartDate: "$vehicles.insurance.insuranceStartDate",
        insuranceEndDate: "$vehicles.insurance.insuranceEndDate",
        paidAmount: "$vehicles.insurance.paidAmount",
        remainingDebt: "$vehicles.insurance.remainingDebt",
        plateNumber: "$vehicles.plateNumber",
        model: "$vehicles.model",
      },
    },
  ];

  const [report, countResult] = await Promise.all([
    insuredModel.aggregate([...pipeline, { $skip: skip }, { $limit: limit }]),
    insuredModel.aggregate([...pipeline, { $count: "total" }])
  ]);

  const total = countResult.length > 0 ? countResult[0].total : 0;
  const response = buildPaginatedResponse(report, total, page, limit);

  return successResponse(res, {
    ...response,
    report: response.data
  }, "Vehicle insurance report");
});

export const getOutstandingDebtsReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, agentName } = req.query;

  const matchStage = {};
  if (agentName) {
    matchStage.agentsName = agentName;
  }

  const insuranceMatchStage = {};
  if (startDate && endDate) {
    insuranceMatchStage["vehicles.insurance.insuranceStartDate"] = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }

  // Get unpaid insurances with aggregation
  const unpaidPipeline = [
    ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
    { $unwind: "$vehicles" },
    { $unwind: "$vehicles.insurance" },
    {
      $match: {
        ...insuranceMatchStage,
        "vehicles.insurance.remainingDebt": { $gt: 0 },
        "vehicles.insurance.insuranceStatus": "active"
      }
    },
    {
      $project: {
        customer: { $concat: ["$first_name", " ", "$last_name"] },
        vehiclePlate: "$vehicles.plateNumber",
        insuranceCompany: "$vehicles.insurance.insuranceCompany",
        insuranceType: "$vehicles.insurance.insuranceType",
        insuranceStartDate: "$vehicles.insurance.insuranceStartDate",
        insuranceEndDate: "$vehicles.insurance.insuranceEndDate",
        remainingDebt: "$vehicles.insurance.remainingDebt",
        paidAmount: "$vehicles.insurance.paidAmount",
        totalAmount: "$vehicles.insurance.insuranceAmount"
      }
    }
  ];

  // Get outstanding checks with aggregation
  const checksPipeline = [
    ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
    { $unwind: "$vehicles" },
    { $unwind: "$vehicles.insurance" },
    ...(Object.keys(insuranceMatchStage).length > 0 ? [{ $match: insuranceMatchStage }] : []),
    { $unwind: "$vehicles.insurance.checkDetails" },
    {
      $match: {
        "vehicles.insurance.checkDetails.isReturned": false,
        "vehicles.insurance.checkDetails.checkDueDate": { $lte: new Date() }
      }
    },
    {
      $project: {
        customer: { $concat: ["$first_name", " ", "$last_name"] },
        vehiclePlate: "$vehicles.plateNumber",
        insuranceCompany: "$vehicles.insurance.insuranceCompany",
        insuranceType: "$vehicles.insurance.insuranceType",
        checkNumber: "$vehicles.insurance.checkDetails.checkNumber",
        checkAmount: "$vehicles.insurance.checkDetails.checkAmount",
        dueDate: "$vehicles.insurance.checkDetails.checkDueDate"
      }
    }
  ];

  const [unpaidInsurances, outstandingChecks, debtTotal] = await Promise.all([
    insuredModel.aggregate(unpaidPipeline),
    insuredModel.aggregate(checksPipeline),
    insuredModel.aggregate([
      ...unpaidPipeline,
      {
        $group: {
          _id: null,
          totalDebt: { $sum: "$remainingDebt" }
        }
      }
    ])
  ]);

  const totalDebt = debtTotal.length > 0 ? debtTotal[0].totalDebt : 0;

  return successResponse(res, {
    totalDebt,
    outstandingChecksCount: outstandingChecks.length,
    unpaidInsurancesCount: unpaidInsurances.length,
    outstandingChecks,
    unpaidInsurances,
  });
});

export const getVehicleDataFromGovApi = asyncHandler(async (req, res) => {
  const { plateNumber } = req.params;

  if (!plateNumber) {
    return badRequestResponse(res, "Plate number is required");
  }

  // Sanitize and validate plate number
  const trimmedPlateNumber = String(plateNumber).trim();

  // Validate format: only alphanumeric characters and hyphens, length between 1-20
  if (!/^[a-zA-Z0-9-]{1,20}$/.test(trimmedPlateNumber)) {
    return badRequestResponse(res, "Invalid plate number format. Only alphanumeric characters and hyphens are allowed.");
  }

  // URL encode to prevent injection
  const sanitizedPlateNumber = encodeURIComponent(trimmedPlateNumber);

  const apiUrl = `https://data.gov.il/api/3/action/datastore_search?resource_id=053cea08-09bc-40ec-8f7a-156f0677aff3&limit=5&q=${sanitizedPlateNumber}`;

  try {
    const response = await axios.get(apiUrl, {
      timeout: 10000, // 10 second timeout
      headers: {
        'User-Agent': 'InsuranceManagementSystem/1.0'
      }
    });

    if (response.data && response.data.success) {
      const records = response.data.result.records;

      if (records.length === 0) {
        return notFoundResponse(res, "Vehicle data for this plate number");
      }

      return successResponse(res, {
        plateNumber: trimmedPlateNumber,
        count: records.length,
        data: records,
      }, "Vehicle data retrieved successfully");
    } else {
      return res.status(500).json({
        message: "Failed to retrieve data from government API",
        error: response.data,
      });
    }
  } catch (error) {
    logger.error("Error fetching vehicle data from government API:", error);

    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({
        message: "Request timeout - government API did not respond in time"
      });
    }

    if (error.response) {
      return res.status(error.response.status).json({
        message: "Error from external API",
        error: error.response.data,
      });
    }

    throw error;
  }
});

/**
 * Dashboard Statistics Endpoint
 * Returns all key metrics for the dashboard in a single request
 */
export const getDashboardStatistics = asyncHandler(async (req, res) => {
  // Run all aggregations in parallel for performance
  const [
    totalCustomers,
    totalVehicles,
    activeInsurances,
    expiredInsurances,
    totalAgents,
    totalSystemUsers,
    insurancePayments,
    totalExpenses,
    totalRevenue,
    totalCheques,
    returnedCheques,
    totalAccidents,
    activeAccidents
  ] = await Promise.all([
      // 1. Total Customers
      insuredModel.countDocuments(),

      // 2. Total Vehicles
      insuredModel.aggregate([
        { $unwind: "$vehicles" },
        { $count: "total" }
      ]),

      // 3. Active Insurances (not expired)
      insuredModel.aggregate([
        { $unwind: "$vehicles" },
        { $unwind: "$vehicles.insurance" },
        {
          $match: {
            "vehicles.insurance.insuranceEndDate": { $gte: new Date() }
          }
        },
        { $count: "total" }
      ]),

      // 4. Expired Insurances
      insuredModel.aggregate([
        { $unwind: "$vehicles" },
        { $unwind: "$vehicles.insurance" },
        {
          $match: {
            "vehicles.insurance.insuranceEndDate": { $lt: new Date() }
          }
        },
        { $count: "total" }
      ]),

      // 5. Total Agents
      userModel.countDocuments({ role: "agents" }),

      // 6. Total System Users
      userModel.countDocuments(),

      // 7. Insurance Payments by Method (from insurance paid amounts)
      insuredModel.aggregate([
        { $unwind: "$vehicles" },
        { $unwind: "$vehicles.insurance" },
        {
          $group: {
            _id: "$vehicles.insurance.paymentMethod",
            totalAmount: { $sum: "$vehicles.insurance.paidAmount" }
          }
        }
      ]),

      // 8. Total Expenses
      ExpenseModel.aggregate([
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$amount" }
          }
        }
      ]),

      // 9. Total Revenue
      RevenueModel.aggregate([
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$amount" }
          }
        }
      ]),

      // 10. Total Cheques and Cheque Income
      ChequeModel.aggregate([
        {
          $group: {
            _id: null,
            totalCheques: { $sum: 1 },
            totalChequeIncome: { $sum: "$amount" }
          }
        }
      ]),

      // 11. Returned Cheques Count and Amount
      ChequeModel.aggregate([
        {
          $match: {
            status: "returned"
          }
        },
        {
          $group: {
            _id: null,
            returnedChequesCount: { $sum: 1 },
            totalReturnedCheques: { $sum: "$amount" }
          }
        }
      ]),

      // 12. Total Accidents
      accidentModel.countDocuments(),

      // 13. Active Accidents (status = "open")
      accidentModel.countDocuments({ status: "open" })
    ]);

    // Process insurance payments by method
    let visaIncome = 0;
    let cashIncome = 0;
    let chequeIncome = 0;
    let bankTransferIncome = 0;

    insurancePayments.forEach(item => {
      const method = item._id ? item._id.toLowerCase() : '';
      const amount = item.totalAmount || 0;

      if (method === "card" || method === "visa") {
        visaIncome += amount;
      } else if (method === "cash") {
        cashIncome += amount;
      } else if (method === "check" || method === "cheque") {
        chequeIncome += amount;
      } else if (method === "bank_transfer") {
        bankTransferIncome += amount;
      }
    });

    // Calculate total income from all insurance payments
    const totalInsuranceIncome = visaIncome + cashIncome + chequeIncome + bankTransferIncome;

    // Extract values from aggregation results
    const totalVehiclesCount = totalVehicles.length > 0 ? totalVehicles[0].total : 0;
    const activeInsurancesCount = activeInsurances.length > 0 ? activeInsurances[0].total : 0;
    const expiredInsurancesCount = expiredInsurances.length > 0 ? expiredInsurances[0].total : 0;
    const totalExpensesAmount = totalExpenses.length > 0 ? totalExpenses[0].totalAmount : 0;
    const totalRevenueAmount = totalRevenue.length > 0 ? totalRevenue[0].totalAmount : 0;
    const totalChequesCount = totalCheques.length > 0 ? totalCheques[0].totalCheques : 0;
    const totalChequeIncomeAmount = totalCheques.length > 0 ? totalCheques[0].totalChequeIncome : 0;
    const returnedChequesCount = returnedCheques.length > 0 ? returnedCheques[0].returnedChequesCount : 0;
    const returnedChequesAmount = returnedCheques.length > 0 ? returnedCheques[0].totalReturnedCheques : 0;

    // Calculate total profit (income - expenses)
    const totalProfit = totalInsuranceIncome + totalRevenueAmount - totalExpensesAmount;

    // Prepare the response
    const dashboardStats = {
      customers: {
        totalCustomers,
      },
      vehicles: {
        totalVehicles: totalVehiclesCount,
      },
      insurances: {
        activeInsurances: activeInsurancesCount,
        expiredInsurances: expiredInsurancesCount,
        totalInsurances: activeInsurancesCount + expiredInsurancesCount,
      },
      agents: {
        totalAgents,
      },
      users: {
        totalSystemUsers,
      },
      financials: {
        totalIncome: totalInsuranceIncome + totalRevenueAmount,
        totalInsuranceIncome,
        totalOtherRevenue: totalRevenueAmount,
        totalExpenses: totalExpensesAmount,
        totalProfit,
      },
      incomeByMethod: {
        visaIncome,
        cashIncome,
        chequeIncome,
        bankTransferIncome,
      },
      cheques: {
        totalCheques: totalChequesCount,
        totalChequeIncome: totalChequeIncomeAmount,
        returnedChequesCount,
        returnedChequesAmount,
      },
      accidents: {
        totalAccidents,
        activeAccidents,
        closedAccidents: totalAccidents - activeAccidents,
      },
      summary: {
        totalCustomers,
        totalIncome: totalInsuranceIncome + totalRevenueAmount,
        totalExpenses: totalExpensesAmount,
        visaIncome,
        cashIncome,
        bankTransferIncome,
        totalVehicles: totalVehiclesCount,
        activeInsurances: activeInsurancesCount,
        expiredInsurances: expiredInsurancesCount,
        totalAgents,
        totalCheques: totalChequesCount,
        totalChequeIncome: totalChequeIncomeAmount,
        totalProfit,
        totalAccidents,
        activeAccidents,
        returnedChequesAmount,
        totalSystemUsers,
      }
    };

  return successResponse(res, {
    timestamp: new Date().toISOString(),
    data: dashboardStats
  }, "Dashboard statistics retrieved successfully");
});

// Export financial overview from separate module
export { getFinancialOverview } from './financialOverview.js';

/**
 * Get All Cheques with Filters
 * Returns all cheques across all customers, vehicles, and insurances
 * @query {string} startDate - Filter by check due date from (optional)
 * @query {string} endDate - Filter by check due date to (optional)
 * @query {string} status - Filter by status: 'active', 'returned', or 'all' (default: 'all')
 * @query {number} page - Page number for pagination (optional)
 * @query {number} limit - Number of items per page (optional)
 */
export const listCheques = asyncHandler(async (req, res) => {
  const { startDate, endDate, status = 'all' } = req.query;
  const { page, limit, skip } = getPaginationParams(req.query);

  // Build match conditions
  const matchConditions = {};

  // Filter by date range
  if (startDate || endDate) {
    matchConditions["vehicles.insurance.checkDetails.checkDueDate"] = {};
    if (startDate) {
      matchConditions["vehicles.insurance.checkDetails.checkDueDate"].$gte = new Date(startDate);
    }
    if (endDate) {
      matchConditions["vehicles.insurance.checkDetails.checkDueDate"].$lte = new Date(endDate);
    }
  }

  // Filter by status
  if (status && status !== 'all') {
    if (status === 'returned') {
      matchConditions["vehicles.insurance.checkDetails.isReturned"] = true;
    } else if (status === 'active') {
      matchConditions["vehicles.insurance.checkDetails.isReturned"] = false;
    }
  }

  const pipeline = [
    { $unwind: "$vehicles" },
    { $unwind: "$vehicles.insurance" },
    { $unwind: "$vehicles.insurance.checkDetails" },
    ...(Object.keys(matchConditions).length > 0 ? [{ $match: matchConditions }] : []),
    {
      $project: {
        checkId: "$vehicles.insurance.checkDetails._id",
        checkNumber: "$vehicles.insurance.checkDetails.checkNumber",
        checkAmount: "$vehicles.insurance.checkDetails.checkAmount",
        checkDueDate: "$vehicles.insurance.checkDetails.checkDueDate",
        isReturned: "$vehicles.insurance.checkDetails.isReturned",
        checkImage: "$vehicles.insurance.checkDetails.checkImage",
        customerName: { $concat: ["$first_name", " ", "$last_name"] },
        customerId: "$_id",
        customerPhone: "$phone_number",
        customerIdNumber: "$id_Number",
        vehicleId: "$vehicles._id",
        plateNumber: "$vehicles.plateNumber",
        vehicleModel: "$vehicles.model",
        insuranceId: "$vehicles.insurance._id",
        insuranceCompany: "$vehicles.insurance.insuranceCompany",
        insuranceType: "$vehicles.insurance.insuranceType",
        insuranceStartDate: "$vehicles.insurance.insuranceStartDate",
        insuranceEndDate: "$vehicles.insurance.insuranceEndDate",
        paymentMethod: "$vehicles.insurance.paymentMethod",
      }
    },
    { $sort: { checkDueDate: -1 } }
  ];

  const [cheques, countResult] = await Promise.all([
    insuredModel.aggregate([...pipeline, { $skip: skip }, { $limit: limit }]),
    insuredModel.aggregate([...pipeline, { $count: "total" }])
  ]);

  const total = countResult.length > 0 ? countResult[0].total : 0;

  // Calculate summary statistics
  const allCheques = await insuredModel.aggregate([
    ...pipeline.slice(0, -1) // All except sort
  ]);

  const summary = {
    totalCheques: allCheques.length,
    totalAmount: allCheques.reduce((sum, c) => sum + (c.checkAmount || 0), 0),
    returnedCount: allCheques.filter(c => c.isReturned).length,
    returnedAmount: allCheques.filter(c => c.isReturned).reduce((sum, c) => sum + (c.checkAmount || 0), 0),
    activeCount: allCheques.filter(c => !c.isReturned).length,
    activeAmount: allCheques.filter(c => !c.isReturned).reduce((sum, c) => sum + (c.checkAmount || 0), 0),
  };

  const response = buildPaginatedResponse(cheques, total, page, limit);

  return successResponse(res, {
    timestamp: new Date().toISOString(),
    filters: {
      startDate: startDate || null,
      endDate: endDate || null,
      status: status || 'all'
    },
    summary,
    ...response,
    cheques: response.data
  }, "Cheques retrieved successfully");
});

/**
 * Get all customers with active vehicle insurance
 * GET /api/v1/insured/customers-with-active-insurance
 * Returns customers who have at least one vehicle with active insurance
 * Includes full vehicle list with insurance details
 */
export const getCustomersWithActiveInsurance = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 50,
    insuranceCompany,
    insuranceType,
    agentName,
    city,
    search
  } = req.query;

  const { skip, limit: parsedLimit } = getPaginationParams(page, limit);

  // Build aggregation pipeline
  const pipeline = [];

    // Match stage - filter based on query parameters
    const matchStage = {};

    if (city) {
      matchStage.city = city;
    }

    if (agentName) {
      matchStage.agentsName = agentName;
    }

    // Search by name, ID, phone, or email
    if (search) {
      matchStage.$or = [
        { first_name: { $regex: search, $options: 'i' } },
        { last_name: { $regex: search, $options: 'i' } },
        { id_Number: { $regex: search, $options: 'i' } },
        { phone_number: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    // Unwind vehicles to check for active insurance
    pipeline.push({ $unwind: { path: "$vehicles", preserveNullAndEmptyArrays: false } });
    pipeline.push({ $unwind: { path: "$vehicles.insurance", preserveNullAndEmptyArrays: false } });

    // Filter for active insurance only
    const insuranceMatch = {
      "vehicles.insurance.insuranceStatus": "active",
      "vehicles.insurance.insuranceEndDate": { $gte: new Date() }
    };

    if (insuranceCompany) {
      insuranceMatch["vehicles.insurance.insuranceCompany"] = insuranceCompany;
    }

    if (insuranceType) {
      insuranceMatch["vehicles.insurance.insuranceType"] = insuranceType;
    }

    pipeline.push({ $match: insuranceMatch });

    // Group back to reconstruct customer data with only active insurances
    pipeline.push({
      $group: {
        _id: "$_id",
        customer: { $first: "$$ROOT" },
        vehicles: {
          $push: {
            _id: "$vehicles._id",
            plateNumber: "$vehicles.plateNumber",
            model: "$vehicles.model",
            type: "$vehicles.type",
            ownership: "$vehicles.ownership",
            modelNumber: "$vehicles.modelNumber",
            licenseExpiry: "$vehicles.licenseExpiry",
            lastTest: "$vehicles.lastTest",
            color: "$vehicles.color",
            price: "$vehicles.price",
            image: "$vehicles.image",
            insurance: "$vehicles.insurance"
          }
        },
        activeInsurancesCount: { $sum: 1 },
        totalInsuranceValue: { $sum: "$vehicles.insurance.insuranceAmount" },
        totalPaidAmount: { $sum: "$vehicles.insurance.paidAmount" },
        totalRemainingDebt: { $sum: "$vehicles.insurance.remainingDebt" }
      }
    });

    // Project final structure
    pipeline.push({
      $project: {
        _id: 1,
        first_name: "$customer.first_name",
        last_name: "$customer.last_name",
        id_Number: "$customer.id_Number",
        phone_number: "$customer.phone_number",
        email: "$customer.email",
        city: "$customer.city",
        birth_date: "$customer.birth_date",
        joining_date: "$customer.joining_date",
        agentsName: "$customer.agentsName",
        agentsId: "$customer.agentsId",
        image: "$customer.image",
        notes: "$customer.notes",
        vehicles: 1,
        activeInsurancesCount: 1,
        totalInsuranceValue: 1,
        totalPaidAmount: 1,
        totalRemainingDebt: 1
      }
    });

    // Sort by joining date (newest first)
    pipeline.push({ $sort: { joining_date: -1 } });

    // Execute aggregation with pagination
    const [customers, countResult] = await Promise.all([
      insuredModel.aggregate([...pipeline, { $skip: skip }, { $limit: parsedLimit }]),
      insuredModel.aggregate([...pipeline, { $count: "total" }])
    ]);

    const total = countResult.length > 0 ? countResult[0].total : 0;

    // Calculate summary statistics
    const allCustomers = await insuredModel.aggregate([
      ...pipeline.slice(0, -1) // All except pagination
    ]);

    const summary = {
      totalCustomers: allCustomers.length,
      totalVehiclesWithActiveInsurance: allCustomers.reduce((sum, c) => sum + c.vehicles.length, 0),
      totalActiveInsurances: allCustomers.reduce((sum, c) => sum + c.activeInsurancesCount, 0),
      totalInsuranceValue: allCustomers.reduce((sum, c) => sum + c.totalInsuranceValue, 0),
      totalPaidAmount: allCustomers.reduce((sum, c) => sum + c.totalPaidAmount, 0),
      totalRemainingDebt: allCustomers.reduce((sum, c) => sum + c.totalRemainingDebt, 0)
    };

    const response = buildPaginatedResponse(customers, total, page, parsedLimit);

  return successResponse(res, {
    timestamp: new Date().toISOString(),
    filters: {
      insuranceCompany: insuranceCompany || null,
      insuranceType: insuranceType || null,
      agentName: agentName || null,
      city: city || null,
      search: search || null
    },
    summary,
    ...response,
    customers: response.data
  }, "Customers with active insurance retrieved successfully");
});

// View Insurance Document with Official Settings
export const viewOfficialInsuranceDocument = asyncHandler(async (req, res) => {
  const { insuredId, vehicleId, insuranceId } = req.params;

  // Get active document settings
  const documentSettings = await DocumentSettings.findOne({ isActive: true });
  if (!documentSettings) {
    return notFoundResponse(res, "Active document settings. Please configure document settings first");
  }

  // Get insured customer
  const insured = await insuredModel.findById(insuredId);
  if (!insured) {
    return notFoundResponse(res, "Customer");
  }

  // Get vehicle
  const vehicle = insured.vehicles.id(vehicleId);
  if (!vehicle) {
    return notFoundResponse(res, "Vehicle");
  }

  // Get insurance
  const insurance = vehicle.insurance.id(insuranceId);
  if (!insurance) {
    return notFoundResponse(res, "Insurance");
  }

    // Format dates
    const formatDate = (date) => {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    // Build official document
    const officialDocument = {
      // Document settings
      settings: {
        logo: documentSettings.logo,
        companyName: documentSettings.companyName,
        header: documentSettings.header,
        footer: documentSettings.footer,
        margins: documentSettings.documentTemplate
      },

      // Document info
      documentInfo: {
        title: "Insurance Certificate",
        documentNumber: insurance._id.toString().substring(0, 8).toUpperCase(),
        issueDate: formatDate(new Date()),
        validFrom: formatDate(insurance.insuranceStartDate),
        validUntil: formatDate(insurance.insuranceEndDate)
      },

      // Customer information
      customer: {
        name: `${insured.first_name} ${insured.last_name}`,
        idNumber: insured.id_Number,
        phone: insured.phone_number,
        email: insured.email,
        city: insured.city
      },

      // Vehicle information
      vehicle: {
        plateNumber: vehicle.plateNumber,
        model: vehicle.model,
        type: vehicle.type,
        color: vehicle.color,
        ownership: vehicle.ownership,
        modelNumber: vehicle.modelNumber
      },

      // Insurance details
      insurance: {
        type: insurance.insuranceType,
        company: insurance.insuranceCompany,
        category: insurance.insuranceCategory,
        amount: insurance.insuranceAmount,
        paidAmount: insurance.paidAmount,
        remainingDebt: insurance.remainingDebt,
        status: insurance.insuranceStatus || 'active',
        isUnder24: insurance.isUnder24,
        agent: insurance.agent || 'N/A'
      },

      // Payment summary
      paymentSummary: {
        totalAmount: insurance.insuranceAmount,
        totalPaid: insurance.paidAmount,
        outstanding: insurance.remainingDebt,
        paymentsCount: insurance.payments ? insurance.payments.length : 0,
        payments: insurance.payments ? insurance.payments.map(payment => ({
          amount: payment.amount,
          method: payment.paymentMethod,
          date: formatDate(payment.paymentDate),
          receiptNumber: payment.receiptNumber || 'N/A',
          notes: payment.notes || ''
        })) : []
      }
    };

  return successResponse(res, {
    success: true,
    data: officialDocument
  }, "Official insurance document retrieved successfully");
});

// View Payment Receipt with Official Settings
export const viewOfficialPaymentReceipt = asyncHandler(async (req, res) => {
  const { insuredId, vehicleId, insuranceId, paymentId } = req.params;

  // Get active document settings
  const documentSettings = await DocumentSettings.findOne({ isActive: true });
  if (!documentSettings) {
    return notFoundResponse(res, "Active document settings. Please configure document settings first");
  }

  // Get insured customer
  const insured = await insuredModel.findById(insuredId);
  if (!insured) {
    return notFoundResponse(res, "Customer");
  }

  // Get vehicle
  const vehicle = insured.vehicles.id(vehicleId);
  if (!vehicle) {
    return notFoundResponse(res, "Vehicle");
  }

  // Get insurance
  const insurance = vehicle.insurance.id(insuranceId);
  if (!insurance) {
    return notFoundResponse(res, "Insurance");
  }

  // Get payment
  const payment = insurance.payments.id(paymentId);
  if (!payment) {
    return notFoundResponse(res, "Payment");
  }

    // Format dates
    const formatDate = (date) => {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    // Format currency
    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('en-US', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    };

    // Build official receipt
    const officialReceipt = {
      // Document settings
      settings: {
        logo: documentSettings.logo,
        companyName: documentSettings.companyName,
        header: documentSettings.header,
        footer: documentSettings.footer,
        margins: documentSettings.documentTemplate
      },

      // Receipt info
      receiptInfo: {
        title: "Payment Receipt",
        receiptNumber: payment.receiptNumber || payment._id.toString().substring(0, 8).toUpperCase(),
        issueDate: formatDate(new Date()),
        paymentDate: formatDate(payment.paymentDate)
      },

      // Customer information
      customer: {
        name: `${insured.first_name} ${insured.last_name}`,
        idNumber: insured.id_Number,
        phone: insured.phone_number,
        email: insured.email
      },

      // Vehicle information
      vehicle: {
        plateNumber: vehicle.plateNumber,
        model: vehicle.model,
        type: vehicle.type
      },

      // Insurance reference
      insuranceReference: {
        type: insurance.insuranceType,
        company: insurance.insuranceCompany,
        policyNumber: insurance._id.toString().substring(0, 8).toUpperCase()
      },

      // Payment details
      paymentDetails: {
        amount: formatCurrency(payment.amount),
        amountNumeric: payment.amount,
        method: payment.paymentMethod,
        paymentDate: formatDate(payment.paymentDate),
        receiptNumber: payment.receiptNumber || 'N/A',
        notes: payment.notes || '',
        recordedBy: payment.recordedBy ? payment.recordedBy.toString() : 'System'
      },

      // Cheque details (if applicable)
      chequeDetails: payment.paymentMethod === 'cheque' && payment.chequeId ? {
        chequeNumber: payment.chequeNumber || 'N/A',
        chequeDate: payment.chequeDate ? formatDate(payment.chequeDate) : 'N/A',
        chequeId: payment.chequeId.toString()
      } : null,

      // Summary
      summary: {
        totalInsuranceAmount: formatCurrency(insurance.insuranceAmount),
        totalPaid: formatCurrency(insurance.paidAmount),
        remainingBalance: formatCurrency(insurance.remainingDebt),
        thisPayment: formatCurrency(payment.amount)
      }
    };

    res.status(200).json({
      success: true,
      message: "Official payment receipt retrieved successfully",
      data: officialReceipt
    });

  } catch (error) {
    logger.error("Error generating official payment receipt:", error);
    next(error);
  }
};

/**
 * Add payment to existing insurance
 * POST /api/v1/insured/addPayment/:insuredId/:vehicleId/:insuranceId
 */
export const createPayment = async (req, res, next) => {
  try {
    const { insuredId, vehicleId, insuranceId } = req.params;
    const {
      amount,
      paymentMethod,
      paymentDate,
      notes,
      receiptNumber,
      chequeNumber,
      chequeDate,
      chequeStatus
    } = req.body;

    // Validate required fields
    if (!amount || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "Amount and payment method are required"
      });
    }

    // Validate amount
    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than 0"
      });
    }

    // Validate payment method
    const validPaymentMethods = ['cash', 'card', 'cheque', 'bank_transfer'];
    if (!validPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: `Payment method must be one of: ${validPaymentMethods.join(', ')}`
      });
    }

    // If cheque, validate cheque fields
    if (paymentMethod === 'cheque') {
      if (!chequeNumber || !chequeDate) {
        return res.status(400).json({
          success: false,
          message: "Cheque number and cheque date are required for cheque payments"
        });
      }
    }

    // Find customer
    const insured = await insuredModel.findById(insuredId);
    if (!insured) {
      return res.status(404).json({
        success: false,
        message: "Customer not found"
      });
    }

    // Find vehicle
    const vehicle = insured.vehicles.id(vehicleId);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found"
      });
    }

    // Find insurance
    const insurance = vehicle.insurance.id(insuranceId);
    if (!insurance) {
      return res.status(404).json({
        success: false,
        message: "Insurance not found"
      });
    }

    // Check if insurance is already fully paid
    if (insurance.remainingDebt <= 0) {
      return res.status(400).json({
        success: false,
        message: "Insurance is already fully paid"
      });
    }

    // Check if payment amount exceeds remaining debt
    if (amount > insurance.remainingDebt) {
      return res.status(400).json({
        success: false,
        message: `Payment amount (${amount}) exceeds remaining debt (${insurance.remainingDebt})`
      });
    }

    // Create cheque document if payment method is cheque
    let chequeId = null;
    if (paymentMethod === 'cheque') {
      const chequeDoc = await ChequeModel.create({
        chequeNumber: chequeNumber,
        customer: {
          insuredId: insuredId,
          name: `${insured.first_name} ${insured.last_name}`,
          idNumber: insured.id_Number,
          phoneNumber: insured.phone_number
        },
        chequeDate: new Date(chequeDate),
        amount: amount,
        status: chequeStatus || 'pending',
        insuranceId: insuranceId,
        vehicleId: vehicleId,
        notes: notes || `Payment for ${insurance.insuranceType} insurance`,
        createdBy: req.user._id
      });
      chequeId = chequeDoc._id;
    }

    // Auto-generate receipt number if not provided
    let finalReceiptNumber = receiptNumber;
    if (!finalReceiptNumber || finalReceiptNumber.trim() === '') {
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      finalReceiptNumber = `REC-${timestamp}-${random}`;
    }

    // Create payment object
    const newPayment = {
      amount: parseFloat(amount),
      paymentMethod: paymentMethod,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      notes: notes || '',
      receiptNumber: finalReceiptNumber,
      recordedBy: req.user._id,
      chequeId: chequeId,
      chequeNumber: paymentMethod === 'cheque' ? chequeNumber : null,
      chequeDate: paymentMethod === 'cheque' ? new Date(chequeDate) : null
    };

    // Add payment to insurance
    insurance.payments.push(newPayment);

    // Save the document (pre-save hook will recalculate paidAmount and remainingDebt)
    await insured.save();

    // Create revenue record
    await RevenueModel.create({
      title: `Insurance Payment - ${insurance.insuranceType}`,
      amount: parseFloat(amount),
      receivedFrom: `${insured.first_name} ${insured.last_name}`,
      paymentMethod: paymentMethod === 'cheque' ? 'check' : paymentMethod,
      date: paymentDate ? new Date(paymentDate) : new Date(),
      description: notes || `${paymentMethod} payment for ${insurance.insuranceCompany} insurance`,
      category: 'Insurance Payment',
      insuranceId: insuranceId,
      customerId: insuredId
    });

    // Invalidate related caches
    await invalidateAllRelatedCaches();

    // Log audit
    await logAudit({
      userId: req.user._id,
      action: "Add Payment to Insurance",
      entity: "Insurance Payment",
      entityId: insuranceId,
      userName: req.user.name,
      newValue: {
        amount: amount,
        paymentMethod: paymentMethod,
        insuranceId: insuranceId,
        customerId: insuredId,
        vehicleId: vehicleId
      }
    });

    // Get updated insurance data
    const updatedInsured = await insuredModel.findById(insuredId);
    const updatedVehicle = updatedInsured.vehicles.id(vehicleId);
    const updatedInsurance = updatedVehicle.insurance.id(insuranceId);

    return res.status(200).json({
      success: true,
      message: "Payment added successfully",
      data: {
        payment: newPayment,
        insurance: {
          _id: updatedInsurance._id,
          insuranceType: updatedInsurance.insuranceType,
          insuranceCompany: updatedInsurance.insuranceCompany,
          insuranceAmount: updatedInsurance.insuranceAmount,
          paidAmount: updatedInsurance.paidAmount,
          remainingDebt: updatedInsurance.remainingDebt,
          paymentsCount: updatedInsurance.payments.length
        }
      }
    });

  } catch (error) {
    logger.error("Error adding payment to insurance:", error);
    next(error);
  }
};

/**
 * Get all payments with filters
 * GET /api/v1/insured/payments/all
 * Query params: customerId, paymentMethod, startDate, endDate, page, limit
 */
export const listPayments = async (req, res, next) => {
  try {
    const {
      customerId,
      paymentMethod,
      startDate,
      endDate,
      page = 1,
      limit = 50,
      sortBy = 'paymentDate',
      sortOrder = 'desc'
    } = req.query;

    // Parse pagination
    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);
    const skip = (parsedPage - 1) * parsedLimit;

    // Build aggregation pipeline
    const pipeline = [];

    // Match stage - filter by customerId if provided
    const matchStage = {};
    if (customerId) {
      matchStage._id = new mongoose.Types.ObjectId(customerId);
    }

    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    // Unwind vehicles
    pipeline.push({ $unwind: "$vehicles" });

    // Unwind insurance
    pipeline.push({ $unwind: "$vehicles.insurance" });

    // Unwind payments
    pipeline.push({ $unwind: "$vehicles.insurance.payments" });

    // Build payment filter
    const paymentMatch = {};

    // Filter by payment method
    if (paymentMethod) {
      paymentMatch["vehicles.insurance.payments.paymentMethod"] = paymentMethod;
    }

    // Filter by date range
    if (startDate || endDate) {
      paymentMatch["vehicles.insurance.payments.paymentDate"] = {};

      if (startDate) {
        paymentMatch["vehicles.insurance.payments.paymentDate"].$gte = new Date(startDate);
      }

      if (endDate) {
        // Set to end of day
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        paymentMatch["vehicles.insurance.payments.paymentDate"].$lte = endDateTime;
      }
    }

    if (Object.keys(paymentMatch).length > 0) {
      pipeline.push({ $match: paymentMatch });
    }

    // Lookup user who recorded the payment
    pipeline.push({
      $lookup: {
        from: "users",
        localField: "vehicles.insurance.payments.recordedBy",
        foreignField: "_id",
        as: "recordedByUser"
      }
    });

    // Project final structure
    pipeline.push({
      $project: {
        paymentId: "$vehicles.insurance.payments._id",
        amount: "$vehicles.insurance.payments.amount",
        paymentMethod: "$vehicles.insurance.payments.paymentMethod",
        paymentDate: "$vehicles.insurance.payments.paymentDate",
        notes: "$vehicles.insurance.payments.notes",
        receiptNumber: "$vehicles.insurance.payments.receiptNumber",
        chequeNumber: "$vehicles.insurance.payments.chequeNumber",
        chequeDate: "$vehicles.insurance.payments.chequeDate",
        chequeId: "$vehicles.insurance.payments.chequeId",
        recordedBy: {
          $arrayElemAt: ["$recordedByUser.name", 0]
        },
        recordedById: "$vehicles.insurance.payments.recordedBy",
        customer: {
          _id: "$_id",
          name: { $concat: ["$first_name", " ", "$last_name"] },
          firstName: "$first_name",
          lastName: "$last_name",
          idNumber: "$id_Number",
          phone: "$phone_number",
          email: "$email",
          city: "$city"
        },
        vehicle: {
          _id: "$vehicles._id",
          plateNumber: "$vehicles.plateNumber",
          model: "$vehicles.model",
          type: "$vehicles.type",
          color: "$vehicles.color"
        },
        insurance: {
          _id: "$vehicles.insurance._id",
          insuranceType: "$vehicles.insurance.insuranceType",
          insuranceCompany: "$vehicles.insurance.insuranceCompany",
          insuranceAmount: "$vehicles.insurance.insuranceAmount",
          paidAmount: "$vehicles.insurance.paidAmount",
          remainingDebt: "$vehicles.insurance.remainingDebt",
          insuranceStartDate: "$vehicles.insurance.insuranceStartDate",
          insuranceEndDate: "$vehicles.insurance.insuranceEndDate"
        }
      }
    });

    // Sort
    const sortField = sortBy === 'paymentDate' ? 'paymentDate' :
                      sortBy === 'amount' ? 'amount' : 'paymentDate';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    pipeline.push({ $sort: { [sortField]: sortDirection } });

    // Get total count before pagination
    const countPipeline = [...pipeline, { $count: "total" }];
    const [payments, countResult] = await Promise.all([
      insuredModel.aggregate([...pipeline, { $skip: skip }, { $limit: parsedLimit }]),
      insuredModel.aggregate(countPipeline)
    ]);

    const total = countResult.length > 0 ? countResult[0].total : 0;
    const totalPages = Math.ceil(total / parsedLimit);

    // Calculate summary statistics
    const summaryPipeline = [...pipeline.slice(0, -1)]; // All except sort
    const allPayments = await insuredModel.aggregate(summaryPipeline);

    const summary = {
      totalPayments: allPayments.length,
      totalAmount: allPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
      byPaymentMethod: {
        cash: allPayments.filter(p => p.paymentMethod === 'cash').reduce((sum, p) => sum + p.amount, 0),
        card: allPayments.filter(p => p.paymentMethod === 'card').reduce((sum, p) => sum + p.amount, 0),
        cheque: allPayments.filter(p => p.paymentMethod === 'cheque').reduce((sum, p) => sum + p.amount, 0),
        bank_transfer: allPayments.filter(p => p.paymentMethod === 'bank_transfer').reduce((sum, p) => sum + p.amount, 0)
      },
      paymentMethodCounts: {
        cash: allPayments.filter(p => p.paymentMethod === 'cash').length,
        card: allPayments.filter(p => p.paymentMethod === 'card').length,
        cheque: allPayments.filter(p => p.paymentMethod === 'cheque').length,
        bank_transfer: allPayments.filter(p => p.paymentMethod === 'bank_transfer').length
      }
    };

    return res.status(200).json({
      success: true,
      message: "Payments retrieved successfully",
      filters: {
        customerId: customerId || null,
        paymentMethod: paymentMethod || null,
        startDate: startDate || null,
        endDate: endDate || null
      },
      summary,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages,
        hasNextPage: parsedPage < totalPages,
        hasPrevPage: parsedPage > 1
      },
      data: payments
    });

  } catch (error) {
    logger.error("Error fetching payments:", error);
    next(error);
  }
};

/**
 * Get due insurances and due cheques
 * GET /api/v1/insured/due-items/all
 * Query params: customerId, startDate, endDate, type, page, limit
 */
export const getDueItems = async (req, res, next) => {
  try {
    const {
      customerId,
      startDate,
      endDate,
      type = 'all', // 'all', 'insurances', 'cheques'
      page = 1,
      limit = 50,
      sortBy = 'dueDate',
      sortOrder = 'asc'
    } = req.query;

    // Parse pagination
    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);
    const skip = (parsedPage - 1) * parsedLimit;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let dueInsurances = [];
    let dueCheques = [];

    // ============= Get Due Insurances =============
    if (type === 'all' || type === 'insurances') {
      const insurancePipeline = [];

      // Match customer if provided
      const customerMatch = {};
      if (customerId) {
        customerMatch._id = new mongoose.Types.ObjectId(customerId);
      }
      if (Object.keys(customerMatch).length > 0) {
        insurancePipeline.push({ $match: customerMatch });
      }

      // Unwind vehicles and insurance
      insurancePipeline.push({ $unwind: "$vehicles" });
      insurancePipeline.push({ $unwind: "$vehicles.insurance" });

      // Match due insurances (has remaining debt)
      const insuranceMatch = {
        "vehicles.insurance.remainingDebt": { $gt: 0 }
      };

      // Date filter for insurance end date
      if (startDate || endDate) {
        insuranceMatch["vehicles.insurance.insuranceEndDate"] = {};
        if (startDate) {
          insuranceMatch["vehicles.insurance.insuranceEndDate"].$gte = new Date(startDate);
        }
        if (endDate) {
          const endDateTime = new Date(endDate);
          endDateTime.setHours(23, 59, 59, 999);
          insuranceMatch["vehicles.insurance.insuranceEndDate"].$lte = endDateTime;
        }
      }

      insurancePipeline.push({ $match: insuranceMatch });

      // Project insurance data
      insurancePipeline.push({
        $project: {
          type: { $literal: "insurance" },
          itemId: "$vehicles.insurance._id",
          dueDate: "$vehicles.insurance.insuranceEndDate",
          amount: "$vehicles.insurance.remainingDebt",
          totalAmount: "$vehicles.insurance.insuranceAmount",
          paidAmount: "$vehicles.insurance.paidAmount",
          status: {
            $cond: {
              if: { $lt: ["$vehicles.insurance.insuranceEndDate", today] },
              then: "overdue",
              else: "upcoming"
            }
          },
          daysUntilDue: {
            $divide: [
              { $subtract: ["$vehicles.insurance.insuranceEndDate", today] },
              1000 * 60 * 60 * 24
            ]
          },
          customer: {
            _id: "$_id",
            name: {
              $concat: [
                { $toString: "$first_name" },
                " ",
                { $toString: "$last_name" }
              ]
            },
            firstName: "$first_name",
            lastName: "$last_name",
            idNumber: "$id_Number",
            phone: "$phone_number",
            email: "$email",
            city: "$city"
          },
          vehicle: {
            _id: "$vehicles._id",
            plateNumber: "$vehicles.plateNumber",
            model: "$vehicles.model",
            type: "$vehicles.type"
          },
          insurance: {
            _id: "$vehicles.insurance._id",
            insuranceType: "$vehicles.insurance.insuranceType",
            insuranceCompany: "$vehicles.insurance.insuranceCompany",
            insuranceStartDate: "$vehicles.insurance.insuranceStartDate",
            insuranceEndDate: "$vehicles.insurance.insuranceEndDate"
          },
          description: {
            $concat: [
              "Insurance debt for ",
              { $toString: "$vehicles.insurance.insuranceType" },
              " - ",
              { $toString: "$vehicles.plateNumber" }
            ]
          }
        }
      });

      dueInsurances = await insuredModel.aggregate(insurancePipeline);
    }

    // ============= Get Due Cheques =============
    if (type === 'all' || type === 'cheques') {
      const chequeMatch = {
        status: { $in: ['pending', 'returned'] }
      };

      // Filter by customer
      if (customerId) {
        chequeMatch['customer.insuredId'] = new mongoose.Types.ObjectId(customerId);
      }

      // Date filter for cheque date
      if (startDate || endDate) {
        chequeMatch.chequeDate = {};
        if (startDate) {
          chequeMatch.chequeDate.$gte = new Date(startDate);
        }
        if (endDate) {
          const endDateTime = new Date(endDate);
          endDateTime.setHours(23, 59, 59, 999);
          chequeMatch.chequeDate.$lte = endDateTime;
        }
      }

      const cheques = await ChequeModel.find(chequeMatch)
        .populate('customer.insuredId', 'first_name last_name id_Number phone_number email city')
        .lean();

      dueCheques = cheques.map(cheque => {
        const chequeDate = new Date(cheque.chequeDate);
        const daysUntilDue = Math.floor((chequeDate - today) / (1000 * 60 * 60 * 24));

        return {
          type: "cheque",
          itemId: cheque._id,
          dueDate: cheque.chequeDate,
          amount: cheque.amount,
          totalAmount: cheque.amount,
          paidAmount: 0,
          status: chequeDate < today ? "overdue" : "upcoming",
          daysUntilDue: daysUntilDue,
          customer: cheque.customer?.insuredId ? {
            _id: cheque.customer.insuredId._id,
            name: `${cheque.customer.insuredId.first_name} ${cheque.customer.insuredId.last_name}`,
            firstName: cheque.customer.insuredId.first_name,
            lastName: cheque.customer.insuredId.last_name,
            idNumber: cheque.customer.insuredId.id_Number,
            phone: cheque.customer.insuredId.phone_number,
            email: cheque.customer.insuredId.email,
            city: cheque.customer.insuredId.city
          } : null,
          cheque: {
            _id: cheque._id,
            chequeNumber: cheque.chequeNumber,
            chequeDate: cheque.chequeDate,
            status: cheque.status,
            bankName: cheque.bankName,
            notes: cheque.notes
          },
          description: `Cheque ${cheque.chequeNumber} - ${cheque.status}`,
          insurance: cheque.insuranceId ? {
            _id: cheque.insuranceId
          } : null
        };
      });
    }

    // ============= Combine and Sort =============
    let allDueItems = [...dueInsurances, ...dueCheques];

    // Sort
    if (sortBy === 'dueDate') {
      allDueItems.sort((a, b) => {
        const dateA = new Date(a.dueDate);
        const dateB = new Date(b.dueDate);
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      });
    } else if (sortBy === 'amount') {
      allDueItems.sort((a, b) => {
        return sortOrder === 'asc' ? a.amount - b.amount : b.amount - a.amount;
      });
    } else if (sortBy === 'status') {
      allDueItems.sort((a, b) => {
        const statusOrder = { overdue: 0, upcoming: 1 };
        const orderA = statusOrder[a.status] || 2;
        const orderB = statusOrder[b.status] || 2;
        return sortOrder === 'asc' ? orderA - orderB : orderB - orderA;
      });
    }

    // ============= Calculate Summary =============
    const summary = {
      totalItems: allDueItems.length,
      totalDueAmount: allDueItems.reduce((sum, item) => sum + item.amount, 0),

      insurances: {
        count: dueInsurances.length,
        totalAmount: dueInsurances.reduce((sum, item) => sum + item.amount, 0),
        overdue: dueInsurances.filter(i => i.status === 'overdue').length,
        upcoming: dueInsurances.filter(i => i.status === 'upcoming').length
      },

      cheques: {
        count: dueCheques.length,
        totalAmount: dueCheques.reduce((sum, item) => sum + item.amount, 0),
        overdue: dueCheques.filter(c => c.status === 'overdue').length,
        upcoming: dueCheques.filter(c => c.status === 'upcoming').length,
        pending: dueCheques.filter(c => c.cheque.status === 'pending').length,
        returned: dueCheques.filter(c => c.cheque.status === 'returned').length
      },

      byStatus: {
        overdue: {
          count: allDueItems.filter(i => i.status === 'overdue').length,
          amount: allDueItems.filter(i => i.status === 'overdue').reduce((sum, i) => sum + i.amount, 0)
        },
        upcoming: {
          count: allDueItems.filter(i => i.status === 'upcoming').length,
          amount: allDueItems.filter(i => i.status === 'upcoming').reduce((sum, i) => sum + i.amount, 0)
        }
      }
    };

    // ============= Pagination =============
    const total = allDueItems.length;
    const totalPages = Math.ceil(total / parsedLimit);
    const paginatedItems = allDueItems.slice(skip, skip + parsedLimit);

    return res.status(200).json({
      success: true,
      message: "Due items retrieved successfully",
      filters: {
        customerId: customerId || null,
        type: type,
        startDate: startDate || null,
        endDate: endDate || null
      },
      summary,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages,
        hasNextPage: parsedPage < totalPages,
        hasPrevPage: parsedPage > 1
      },
      data: paginatedItems
    });

  } catch (error) {
    logger.error("Error fetching due items:", error);
    next(error);
  }
};

/**
 * Get all insured with filters for joining date and agent
 * GET /api/v1/insured/filtered-list
 * Query params: startDate, endDate, agentName, agentId, page, limit, sortBy
 */
export const listFiltered = async (req, res, next) => {
  try {
    const { startDate, endDate, agentName, agentId } = req.query;
    const { page, limit, skip } = getPaginationParams(req.query);
    const sort = getSortParams(req.query, '-joining_date', SORT_FIELDS.INSURED);

    // Build filter object
    const filter = {};

    // Filter by joining date range
    if (startDate || endDate) {
      filter.joining_date = {};

      if (startDate) {
        filter.joining_date.$gte = new Date(startDate);
      }

      if (endDate) {
        // Set to end of day
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        filter.joining_date.$lte = endDateTime;
      }
    }

    // Filter by agent name
    if (agentName) {
      filter.agentsName = agentName;
    }

    // Filter by agent ID
    if (agentId) {
      filter.agentsId = new mongoose.Types.ObjectId(agentId);
    }

    // Use aggregation to calculate vehicle count and total insurances
    const pipeline = [
      { $match: filter },
      {
        $project: {
          name: { $concat: ["$first_name", " ", "$last_name"] },
          identity: "$id_Number",
          mobile: "$phone_number",
          email: "$email",
          joining_date: "$joining_date",
          agent_name: "$agentsName",
          number_of_vehicles: { $size: { $ifNull: ["$vehicles", []] } },
          total_insurances: {
            $sum: {
              $map: {
                input: { $ifNull: ["$vehicles", []] },
                as: "vehicle",
                in: { $size: { $ifNull: ["$$vehicle.insurance", []] } }
              }
            }
          },
          // Keep original fields for sorting if needed
          first_name: 1,
          last_name: 1,
          createdAt: 1,
          updatedAt: 1
        }
      },
      { $sort: sort },
      { $skip: skip },
      { $limit: limit }
    ];

    // Execute aggregation and count in parallel
    const [insuredList, total] = await Promise.all([
      insuredModel.aggregate(pipeline),
      insuredModel.countDocuments(filter)
    ]);

    // Build paginated response
    const response = buildPaginatedResponse(insuredList, total, page, limit);

    return res.status(200).json({
      success: true,
      message: "Filtered insured list retrieved successfully",
      filters: {
        startDate: startDate || null,
        endDate: endDate || null,
        agentName: agentName || null,
        agentId: agentId || null
      },
      ...response
    });

  } catch (error) {
    logger.error("Error fetching filtered insured list:", error);
    next(error);
  }
};
