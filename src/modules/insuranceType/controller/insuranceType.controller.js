import { InsuranceTypeModel } from "#db/models/InsuranceType.model.js";
import PricingTypeModel from "#db/models/PricingType.model.js";
import { userModel } from "#db/models/User.model.js";
import { sendNotificationLogic } from "../../notification/controller/notification.controller.js";
import { notifyAction } from "#utils/notificationHelper.js";
import { asyncHandler } from "#utils/asyncHandler.js";
import { logAudit } from "#utils/auditLogger.js";
import {
  createdResponse,
  successResponse,
  notFoundResponse,
  badRequestResponse,
  conflictResponse
} from "#utils/apiResponse.js";

// Create Insurance Type
export const create = asyncHandler(async (req, res) => {
  const { name, pricing_type_id, description } = req.body;

  if (!name || !name.trim()) {
    return badRequestResponse(res, "Insurance type name is required!");
  }

  if (!pricing_type_id) {
    return badRequestResponse(res, "Pricing type ID is required!");
  }

  // Validate pricing type exists
  const pricingType = await PricingTypeModel.findById(pricing_type_id);
  if (!pricingType) {
    return notFoundResponse(res, "Pricing type");
  }

  const existingType = await InsuranceTypeModel.findOne({
    name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
  });

  if (existingType) {
    return conflictResponse(res, `Insurance type '${name}' already exists!`);
  }

  const newType = new InsuranceTypeModel({
    name: name.trim(),
    pricing_type_id,
    description: description || ""
  });
  await newType.save();

  // Send notification using helper
  await notifyAction(
    req.user._id,
    (userName, typeName) => `${userName} added new insurance type: ${typeName}`,
    name
  );

  // Log audit (user name needed for audit)
  const findUser = await userModel.findById(req.user._id);
  await logAudit({
    userId: req.user._id,
    userName: findUser.name,
    action: `Create Insurance Type by ${findUser.name}`,
    entity: "InsuranceType",
    entityId: newType._id,
    oldValue: null,
    newValue: newType.toObject()
  });

  return createdResponse(res, { insuranceType: newType }, "Insurance type added successfully");
});

// Get All Insurance Types
export const list = asyncHandler(async (req, res) => {
  const types = await InsuranceTypeModel.find()
    .populate('pricing_type_id', 'name description requiresPricingTable')
    .sort({ name: 1 });

  return successResponse(res, {
    insuranceTypes: types,
    count: types.length
  }, "Insurance types retrieved successfully");
});

// Get Insurance Type by ID
export const getInsuranceTypeById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const insuranceType = await InsuranceTypeModel.findById(id)
    .populate('pricing_type_id', 'name description requiresPricingTable');

  if (!insuranceType) {
    return notFoundResponse(res, "Insurance type");
  }

  return successResponse(res, { insuranceType }, "Insurance type retrieved successfully");
});

// Update Insurance Type
export const updateInsuranceType = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, pricing_type_id, description } = req.body;

  if (!name || !name.trim()) {
    return badRequestResponse(res, "Insurance type name is required!");
  }

  const insuranceType = await InsuranceTypeModel.findById(id);
  if (!insuranceType) {
    return notFoundResponse(res, "Insurance type");
  }

  // If pricing_type_id is being updated, validate it
  if (pricing_type_id && pricing_type_id !== insuranceType.pricing_type_id) {
    const pricingType = await PricingTypeModel.findById(pricing_type_id);
    if (!pricingType) {
      return notFoundResponse(res, "Pricing type");
    }
  }

  const duplicateType = await InsuranceTypeModel.findOne({
    name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
    _id: { $ne: id }
  });

  if (duplicateType) {
    return conflictResponse(res, `Insurance type '${name}' already exists!`);
  }

  const oldValue = insuranceType.toObject();

  insuranceType.name = name.trim();
  if (pricing_type_id) insuranceType.pricing_type_id = pricing_type_id;
  if (description !== undefined) insuranceType.description = description;
  await insuranceType.save();

  // Send notification using helper
  await notifyAction(
    req.user._id,
    (userName, typeName) => `${userName} updated insurance type: ${typeName}`,
    name
  );

  // Log audit (user name needed for audit)
  const findUser = await userModel.findById(req.user._id);
  await logAudit({
    userId: req.user._id,
    userName: findUser.name,
    action: `Update Insurance Type by ${findUser.name}`,
    entity: "InsuranceType",
    entityId: insuranceType._id,
    oldValue,
    newValue: insuranceType.toObject()
  });

  return successResponse(res, { insuranceType }, "Insurance type updated successfully");
});

// Delete Insurance Type
export const deleteInsuranceType = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const insuranceType = await InsuranceTypeModel.findById(id);
  if (!insuranceType) {
    return notFoundResponse(res, "Insurance type");
  }

  const oldValue = insuranceType.toObject();
  await InsuranceTypeModel.findByIdAndDelete(id);

  // Send notification using helper
  await notifyAction(
    req.user._id,
    (userName, typeName) => `${userName} deleted insurance type: ${typeName}`,
    insuranceType.name
  );

  // Log audit (user name needed for audit)
  const findUser = await userModel.findById(req.user._id);
  await logAudit({
    userId: req.user._id,
    userName: findUser.name,
    action: `Delete Insurance Type by ${findUser.name}`,
    entity: "InsuranceType",
    entityId: id,
    oldValue,
    newValue: null
  });

  return successResponse(res, null, "Insurance type deleted successfully");
});
