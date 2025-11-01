import InsuranceCompany from "#db/models/insuranceCompany.model.js";
import { InsuranceTypeModel } from "#db/models/InsuranceType.model.js";
import { RoadServiceModel } from "#db/models/RoadService.model.js";
import { userModel } from "#db/models/User.model.js";
import { sendNotificationLogic } from "../../notification/controller/notification.controller.js";
import { notifyAction } from "#utils/notificationHelper.js";
import { asyncHandler } from "#utils/asyncHandler.js";
import { logAudit } from "#utils/auditLogger.js";
import {
  createdResponse,
  successResponse,
  notFoundResponse,
  badRequestResponse
} from "#utils/apiResponse.js";

export const create = asyncHandler(async (req, res) => {
  const { name, insuranceTypeIds, roadServiceIds } = req.body;

  if (!name || !Array.isArray(insuranceTypeIds) || insuranceTypeIds.length === 0) {
    return badRequestResponse(res, "Name and at least one insurance type ID are required!");
  }

  // Verify all insurance type IDs exist
  const insuranceTypes = await InsuranceTypeModel.find({ _id: { $in: insuranceTypeIds } });
  if (insuranceTypes.length !== insuranceTypeIds.length) {
    return badRequestResponse(res, "One or more insurance type IDs are invalid!");
  }

  // Verify all road service IDs exist (if provided)
  let validRoadServiceIds = [];
  if (roadServiceIds && Array.isArray(roadServiceIds) && roadServiceIds.length > 0) {
    const roadServices = await RoadServiceModel.find({ _id: { $in: roadServiceIds } });
    if (roadServices.length !== roadServiceIds.length) {
      return badRequestResponse(res, "One or more road service IDs are invalid!");
    }
    validRoadServiceIds = roadServiceIds;
  }

  const newCompany = new InsuranceCompany({
    name,
    insuranceTypes: insuranceTypeIds,
    roadServices: validRoadServiceIds
  });

  await newCompany.save();

  // Send notification using helper
  await notifyAction(
    req.user._id,
    (userName, companyName) => `${userName} added a new insurance company: ${companyName}`,
    name
  );

  // Log audit (user name needed for audit)
  const findUser = await userModel.findById(req.user._id);
  await logAudit({
    userId: req.user._id,
    userName: findUser.name,
    action: `Create InsuranceCompany by ${findUser.name}`,
    entity: "InsuranceCompany",
    entityId: newCompany._id,
    oldValue: null,
    newValue: newCompany.toObject()
  });

  return createdResponse(res, { company: newCompany }, "Insurance company added successfully");
});

export const updateInsuranceCompany = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, insuranceTypeIds, roadServiceIds } = req.body;

  const existingCompany = await InsuranceCompany.findById(id);
  if (!existingCompany) {
    return notFoundResponse(res, "Insurance company");
  }

  const oldValue = existingCompany.toObject();

  const updatedData = {};
  if (name) updatedData.name = name;

  if (Array.isArray(insuranceTypeIds) && insuranceTypeIds.length > 0) {
    // Verify all insurance type IDs exist
    const insuranceTypes = await InsuranceTypeModel.find({ _id: { $in: insuranceTypeIds } });
    if (insuranceTypes.length !== insuranceTypeIds.length) {
      return badRequestResponse(res, "One or more insurance type IDs are invalid!");
    }
    updatedData.insuranceTypes = insuranceTypeIds;
  }

  if (Array.isArray(roadServiceIds) && roadServiceIds.length > 0) {
    // Verify all road service IDs exist
    const roadServices = await RoadServiceModel.find({ _id: { $in: roadServiceIds } });
    if (roadServices.length !== roadServiceIds.length) {
      return badRequestResponse(res, "One or more road service IDs are invalid!");
    }
    updatedData.roadServices = roadServiceIds;
  }

  const updatedCompany = await InsuranceCompany.findByIdAndUpdate(
    id,
    updatedData,
    { new: true }
  );

  // Send notification using helper
  await notifyAction(
    req.user._id,
    (userName, companyName) => `${userName} updated insurance company: ${companyName}`,
    updatedCompany.name
  );

  // Log audit (user name needed for audit)
  const findUser = await userModel.findById(req.user._id);
  await logAudit({
    userId: req.user._id,
    userName: findUser.name,
    action: `Update InsuranceCompany by ${findUser.name}`,
    entity: "InsuranceCompany",
    entityId: updatedCompany._id,
    oldValue,
    newValue: updatedCompany.toObject()
  });

  return successResponse(res, { company: updatedCompany }, "Insurance company updated successfully");
});

export const deleteInsuranceCompany = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const deletedCompany = await InsuranceCompany.findByIdAndDelete(id);
  if (!deletedCompany) {
    return notFoundResponse(res, "Insurance company");
  }

  // Send notification using helper
  const user = req.user;
  await notifyAction(
    req.user._id,
    (userName, companyName) => `${userName} deleted insurance company: ${companyName}`,
    deletedCompany.name
  );

  // Log audit
  await logAudit({
    userId: user._id,
    userName: user.name,
    action: `Delete InsuranceCompany by ${user.name}`,
    entity: "InsuranceCompany",
    entityId: deletedCompany._id,
    oldValue: deletedCompany.toObject(),
    newValue: null
  });

  return successResponse(res, null, "Insurance company deleted successfully");
});

export const list = asyncHandler(async (req, res) => {
  const companies = await InsuranceCompany.find()
    .populate('insuranceTypes', 'name')
    .populate('roadServices', 'name price');

  return successResponse(res, { companies, count: companies.length }, "Insurance companies retrieved successfully");
});

/**
 * Get insurance company by ID
 * GET /api/v1/company/:id
 */
export const getInsuranceCompanyById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const company = await InsuranceCompany.findById(id)
    .populate('insuranceTypes', 'name description')
    .populate('roadServices', 'service_name normal_price old_car_price cutoff_year description is_active');

  if (!company) {
    return notFoundResponse(res, "Insurance company");
  }

  return successResponse(res, { company }, "Insurance company retrieved successfully");
});

/**
 * Get insurance companies by insurance type
 * GET /api/v1/company/by-type/:insuranceTypeId
 */
export const getCompaniesByInsuranceType = asyncHandler(async (req, res) => {
  const { insuranceTypeId } = req.params;

  // Verify insurance type exists
  const insuranceType = await InsuranceTypeModel.findById(insuranceTypeId);
  if (!insuranceType) {
    return notFoundResponse(res, "Insurance type");
  }

  // Find all companies that have this insurance type
  const companies = await InsuranceCompany.find({
    insuranceTypes: insuranceTypeId
  })
    .populate('insuranceTypes', 'name description pricing_type_id')
    .populate('roadServices', 'service_name normal_price old_car_price cutoff_year description is_active');

  return successResponse(res, {
    insuranceType: {
      _id: insuranceType._id,
      name: insuranceType.name,
      description: insuranceType.description
    },
    companies,
    count: companies.length
  }, "Insurance companies retrieved successfully");
});
