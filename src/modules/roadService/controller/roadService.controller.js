import { RoadServiceModel } from "#db/models/RoadService.model.js";
import InsuranceCompany from "#db/models/insuranceCompany.model.js";
import { userModel } from "#db/models/User.model.js";
import { sendNotificationLogic } from "../../notification/controller/notification.controller.js";
import { notifyAction } from "#utils/notificationHelper.js";
import logger from "#utils/logService.js";
import { getPaginationParams, buildPaginatedResponse } from "#utils/pagination.js";
import { asyncHandler } from "#utils/asyncHandler.js";
import { logAudit } from "#utils/auditLogger.js";
import {
  createdResponse,
  successResponse,
  notFoundResponse,
  badRequestResponse,
  conflictResponse
} from "#utils/apiResponse.js";

/**
 * Create a new road service
 * POST /api/v1/road-service/:companyId
 */
export const create = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { service_name, normal_price, old_car_price, cutoff_year, description } = req.body;

  // Validate company exists
  const company = await InsuranceCompany.findById(companyId);
  if (!company) {
    return notFoundResponse(res, "Insurance company");
  }

  const roadService = new RoadServiceModel({
    company_id: companyId,
    service_name,
    normal_price,
    old_car_price,
    cutoff_year: cutoff_year || 2007,
    description: description || "",
    is_active: true
  });

  try {
    const savedService = await roadService.save();

    // Send notification using helper
    await notifyAction(
      req.user._id,
      (userName, serviceName, companyName) => `${userName} added new road service: ${serviceName} for ${companyName}`,
      service_name,
      company.name
    );

    // Log audit (user name needed for audit)
    const findUser = await userModel.findById(req.user._id);
    await logAudit({
      userId: req.user._id,
      userName: findUser.name,
      action: `Create Road Service by ${findUser.name}`,
      entity: "RoadService",
      entityId: savedService._id,
      oldValue: null,
      newValue: savedService.toObject()
    });

    logger.info(`Road service created: ${service_name} for company ${companyId}`);

    return createdResponse(res, { roadService: savedService }, "Road service created successfully");
  } catch (error) {
    if (error.code === 11000) {
      return conflictResponse(res, "A road service with this name already exists for this company");
    }
    throw error;
  }
});

/**
 * Get all road services
 * GET /api/v1/road-service/all
 */
export const list = asyncHandler(async (req, res) => {
  const { company_id, is_active } = req.query;
  const { page, limit, skip } = getPaginationParams(req.query);

  // Build query
  const query = {};
  if (company_id) query.company_id = company_id;
  if (is_active !== undefined) query.is_active = is_active === 'true';

  const [services, total] = await Promise.all([
    RoadServiceModel.find(query)
      .populate("company_id", "name description")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    RoadServiceModel.countDocuments(query)
  ]);

  const response = buildPaginatedResponse(services, total, page, limit);

  return successResponse(res, response, "Road services retrieved successfully");
});

/**
 * Get road services by company
 * GET /api/v1/road-service/company/:companyId
 */
export const getRoadServicesByCompany = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { is_active } = req.query;

  const query = { company_id: companyId };
  if (is_active !== undefined) query.is_active = is_active === 'true';

  const services = await RoadServiceModel.find(query)
    .populate("company_id", "name description")
    .sort({ service_name: 1 })
    .lean();

  return successResponse(res, {
    roadServices: services,
    count: services.length
  }, "Road services retrieved successfully");
});

/**
 * Get single road service by ID
 * GET /api/v1/road-service/:id
 */
export const getRoadServiceById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const service = await RoadServiceModel.findById(id)
    .populate("company_id", "name description");

  if (!service) {
    return notFoundResponse(res, "Road service");
  }

  return successResponse(res, { roadService: service }, "Road service retrieved successfully");
});

/**
 * Update road service
 * PATCH /api/v1/road-service/:id
 */
export const updateRoadService = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { service_name, normal_price, old_car_price, cutoff_year, description, is_active } = req.body;

  const service = await RoadServiceModel.findById(id);

  if (!service) {
    return notFoundResponse(res, "Road service");
  }

  const oldValue = service.toObject();

  // Update fields if provided
  if (service_name !== undefined) service.service_name = service_name;
  if (normal_price !== undefined) service.normal_price = normal_price;
  if (old_car_price !== undefined) service.old_car_price = old_car_price;
  if (cutoff_year !== undefined) service.cutoff_year = cutoff_year;
  if (description !== undefined) service.description = description;
  if (is_active !== undefined) service.is_active = is_active;

  try {
    const updatedService = await service.save();

    // Send notification using helper
    await notifyAction(
      req.user._id,
      (userName, serviceName) => `${userName} updated road service: ${serviceName}`,
      updatedService.service_name
    );

    // Log audit (user name needed for audit)
    const findUser = await userModel.findById(req.user._id);
    await logAudit({
      userId: req.user._id,
      userName: findUser.name,
      action: `Update Road Service by ${findUser.name}`,
      entity: "RoadService",
      entityId: updatedService._id,
      oldValue,
      newValue: updatedService.toObject()
    });

    logger.info(`Road service updated: ${id}`);

    return successResponse(res, { roadService: updatedService }, "Road service updated successfully");
  } catch (error) {
    if (error.code === 11000) {
      return conflictResponse(res, "A road service with this name already exists for this company");
    }
    throw error;
  }
});

/**
 * Delete road service
 * DELETE /api/v1/road-service/:id
 */
export const deleteRoadService = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const roadService = await RoadServiceModel.findById(id);
  if (!roadService) {
    return notFoundResponse(res, "Road service");
  }

  const oldValue = roadService.toObject();
  await RoadServiceModel.findByIdAndDelete(id);

  // Send notification using helper
  await notifyAction(
    req.user._id,
    (userName, serviceName) => `${userName} deleted road service: ${serviceName}`,
    roadService.service_name
  );

  // Log audit (user name needed for audit)
  const findUser = await userModel.findById(req.user._id);
  await logAudit({
    userId: req.user._id,
    userName: findUser.name,
    action: `Delete Road Service by ${findUser.name}`,
    entity: "RoadService",
    entityId: id,
    oldValue,
    newValue: null
  });

  logger.info(`Road service deleted: ${id}`);

  return successResponse(res, { deletedService: roadService }, "Road service deleted successfully");
});

/**
 * Calculate road service price based on vehicle year
 * POST /api/v1/road-service/calculate-price
 */
export const calculateRoadServicePrice = asyncHandler(async (req, res) => {
  const { service_id, vehicle_year } = req.body;

  if (!service_id || !vehicle_year) {
    return badRequestResponse(res, "service_id and vehicle_year are required");
  }

  const service = await RoadServiceModel.findById(service_id)
    .populate("company_id", "name");

  if (!service) {
    return notFoundResponse(res, "Road service");
  }

  if (!service.is_active) {
    return badRequestResponse(res, "This road service is currently inactive");
  }

  // Determine price based on vehicle year
  const isOldCar = vehicle_year < service.cutoff_year;
  const price = isOldCar ? service.old_car_price : service.normal_price;

  return successResponse(res, {
    service_name: service.service_name,
    company_name: service.company_id.name,
    vehicle_year,
    cutoff_year: service.cutoff_year,
    is_old_car: isOldCar,
    price,
    normal_price: service.normal_price,
    old_car_price: service.old_car_price
  }, "Price calculated successfully");
});
