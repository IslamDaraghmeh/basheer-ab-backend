import { RoadServiceModel } from "../../../../DB/models/RoadService.model.js";
import InsuranceCompany from "../../../../DB/models/insuranceCompany.model.js";
import AuditLogModel from "../../../../DB/models/AuditLog.model.js";
import { userModel } from "../../../../DB/models/user.model.js";
import { sendNotificationLogic } from "../../notification/controller/notification.controller.js";
import logger from "../../../utils/logService.js";
import { getPaginationParams, buildPaginatedResponse } from "../../../utils/pagination.js";

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

/**
 * Create a new road service
 * POST /api/v1/road-service/:companyId
 */
export const addRoadService = async (req, res, next) => {
  try {
    const { companyId } = req.params;
    const { service_name, normal_price, old_car_price, cutoff_year, description } = req.body;

    // Validate company exists
    const company = await InsuranceCompany.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: "Insurance company not found" });
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

    const savedService = await roadService.save();

    const findUser = await userModel.findById(req.user._id);
    const message = `${findUser.name} added new road service: ${service_name} for ${company.name}`;

    await sendNotificationLogic({
      senderId: req.user._id,
      message
    });

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

    return res.status(201).json({
      message: "Road service created successfully",
      roadService: savedService
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "A road service with this name already exists for this company"
      });
    }
    logger.error("Error creating road service:", error);
    next(error);
  }
};

/**
 * Get all road services
 * GET /api/v1/road-service/all
 */
export const getAllRoadServices = async (req, res, next) => {
  try {
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

    return res.status(200).json({
      message: "Road services retrieved successfully",
      ...response
    });

  } catch (error) {
    logger.error("Error getting all road services:", error);
    next(error);
  }
};

/**
 * Get road services by company
 * GET /api/v1/road-service/company/:companyId
 */
export const getRoadServicesByCompany = async (req, res, next) => {
  try {
    const { companyId } = req.params;
    const { is_active } = req.query;

    const query = { company_id: companyId };
    if (is_active !== undefined) query.is_active = is_active === 'true';

    const services = await RoadServiceModel.find(query)
      .populate("company_id", "name description")
      .sort({ service_name: 1 })
      .lean();

    return res.status(200).json({
      message: "Road services retrieved successfully",
      count: services.length,
      roadServices: services
    });

  } catch (error) {
    logger.error("Error getting company road services:", error);
    next(error);
  }
};

/**
 * Get single road service by ID
 * GET /api/v1/road-service/:id
 */
export const getRoadServiceById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const service = await RoadServiceModel.findById(id)
      .populate("company_id", "name description");

    if (!service) {
      return res.status(404).json({ message: "Road service not found" });
    }

    return res.status(200).json({
      message: "Road service retrieved successfully",
      roadService: service
    });

  } catch (error) {
    logger.error("Error getting road service:", error);
    next(error);
  }
};

/**
 * Update road service
 * PATCH /api/v1/road-service/:id
 */
export const updateRoadService = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { service_name, normal_price, old_car_price, cutoff_year, description, is_active } = req.body;

    const service = await RoadServiceModel.findById(id);

    if (!service) {
      return res.status(404).json({ message: "Road service not found" });
    }

    const oldValue = service.toObject();

    // Update fields if provided
    if (service_name !== undefined) service.service_name = service_name;
    if (normal_price !== undefined) service.normal_price = normal_price;
    if (old_car_price !== undefined) service.old_car_price = old_car_price;
    if (cutoff_year !== undefined) service.cutoff_year = cutoff_year;
    if (description !== undefined) service.description = description;
    if (is_active !== undefined) service.is_active = is_active;

    const updatedService = await service.save();

    const findUser = await userModel.findById(req.user._id);
    const message = `${findUser.name} updated road service: ${updatedService.service_name}`;

    await sendNotificationLogic({
      senderId: req.user._id,
      message
    });

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

    return res.status(200).json({
      message: "Road service updated successfully",
      roadService: updatedService
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "A road service with this name already exists for this company"
      });
    }
    logger.error("Error updating road service:", error);
    next(error);
  }
};

/**
 * Delete road service
 * DELETE /api/v1/road-service/:id
 */
export const deleteRoadService = async (req, res, next) => {
  try {
    const { id } = req.params;

    const roadService = await RoadServiceModel.findById(id);
    if (!roadService) {
      return res.status(404).json({ message: "Road service not found" });
    }

    const oldValue = roadService.toObject();
    await RoadServiceModel.findByIdAndDelete(id);

    const findUser = await userModel.findById(req.user._id);
    const message = `${findUser.name} deleted road service: ${roadService.service_name}`;

    await sendNotificationLogic({
      senderId: req.user._id,
      message
    });

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

    return res.status(200).json({
      message: "Road service deleted successfully",
      deletedService: roadService
    });

  } catch (error) {
    logger.error("Error deleting road service:", error);
    next(error);
  }
};

/**
 * Calculate road service price based on vehicle year
 * POST /api/v1/road-service/calculate-price
 */
export const calculateRoadServicePrice = async (req, res, next) => {
  try {
    const { service_id, vehicle_year } = req.body;

    if (!service_id || !vehicle_year) {
      return res.status(400).json({
        message: "service_id and vehicle_year are required"
      });
    }

    const service = await RoadServiceModel.findById(service_id)
      .populate("company_id", "name");

    if (!service) {
      return res.status(404).json({ message: "Road service not found" });
    }

    if (!service.is_active) {
      return res.status(400).json({ message: "This road service is currently inactive" });
    }

    // Determine price based on vehicle year
    const isOldCar = vehicle_year < service.cutoff_year;
    const price = isOldCar ? service.old_car_price : service.normal_price;

    return res.status(200).json({
      message: "Price calculated successfully",
      service_name: service.service_name,
      company_name: service.company_id.name,
      vehicle_year,
      cutoff_year: service.cutoff_year,
      is_old_car: isOldCar,
      price,
      normal_price: service.normal_price,
      old_car_price: service.old_car_price
    });

  } catch (error) {
    logger.error("Error calculating road service price:", error);
    next(error);
  }
};
