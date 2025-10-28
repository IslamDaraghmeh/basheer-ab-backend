import InsuranceCompany from "../../../../DB/models/insuranceCompany.model.js";
import { InsuranceTypeModel } from "../../../../DB/models/InsuranceType.model.js";
import { RoadServiceModel } from "../../../../DB/models/RoadService.model.js";
import AuditLogModel from "../../../../DB/models/AuditLog.model.js";
import { userModel } from "../../../../DB/models/User.model.js";
import {  sendNotificationLogic } from "../../notification/controller/notification.controller.js";
const logAudit = async ({ userId, action, entity, entityId,userName, oldValue = null, newValue = null }) => {
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

export const addInsuranceCompany = async (req, res, next) => {
  try {
    const { name, insuranceTypeIds, roadServiceIds } = req.body;


    if (!name || !Array.isArray(insuranceTypeIds) || insuranceTypeIds.length === 0) {
      return res.status(400).json({ message: "Name and at least one insurance type ID are required!" });
    }


    // Verify all insurance type IDs exist
    const insuranceTypes = await InsuranceTypeModel.find({ _id: { $in: insuranceTypeIds } });
    if (insuranceTypes.length !== insuranceTypeIds.length) {
      return res.status(400).json({ message: "One or more insurance type IDs are invalid!" });
    }

    // Verify all road service IDs exist (if provided)
    let validRoadServiceIds = [];
    if (roadServiceIds && Array.isArray(roadServiceIds) && roadServiceIds.length > 0) {
      const roadServices = await RoadServiceModel.find({ _id: { $in: roadServiceIds } });
      if (roadServices.length !== roadServiceIds.length) {
        return res.status(400).json({ message: "One or more road service IDs are invalid!" });
      }
      validRoadServiceIds = roadServiceIds;
    }

    const newCompany = new InsuranceCompany({
      name,
      insuranceTypes: insuranceTypeIds,
      roadServices: validRoadServiceIds
    });

    await newCompany.save();


    const findUser = await userModel.findById(req.user._id);
    const message = `${findUser.name} added a new insurance company: ${name}`;

    await sendNotificationLogic({
      senderId: req.user._id,
      message
    });

   
    await logAudit({
      userId: req.user._id,
      userName: findUser.name,
      action: `Create InsuranceCompany by ${findUser.name}`,
      entity: "InsuranceCompany",
      entityId: newCompany._id,
      newValue: newCompany
    });

    res.status(201).json({
      message: "Insurance company added successfully!",
      company: newCompany
    });

  } catch (error) {
    next(error);
  }
};

export const updateInsuranceCompany = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, insuranceTypeIds, roadServiceIds } = req.body;

    const existingCompany = await InsuranceCompany.findById(id);
    if (!existingCompany) {
      return res.status(404).json({ message: "Insurance company not found!" });
    }

    const oldValue = existingCompany.toObject();


    const updatedData = {};
    if (name) updatedData.name = name;

    if (Array.isArray(insuranceTypeIds) && insuranceTypeIds.length > 0) {
      // Verify all insurance type IDs exist
      const insuranceTypes = await InsuranceTypeModel.find({ _id: { $in: insuranceTypeIds } });
      if (insuranceTypes.length !== insuranceTypeIds.length) {
        return res.status(400).json({ message: "One or more insurance type IDs are invalid!" });
      }
      updatedData.insuranceTypes = insuranceTypeIds;
    }

    if (Array.isArray(roadServiceIds) && roadServiceIds.length > 0) {
      // Verify all road service IDs exist
      const roadServices = await RoadServiceModel.find({ _id: { $in: roadServiceIds } });
      if (roadServices.length !== roadServiceIds.length) {
        return res.status(400).json({ message: "One or more road service IDs are invalid!" });
      }
      updatedData.roadServices = roadServiceIds;
    }

    const updatedCompany = await InsuranceCompany.findByIdAndUpdate(
      id,
      updatedData,
      { new: true }
    );

    const findUser = await userModel.findById(req.user._id);
    const message = `${findUser.name} updated insurance company: ${updatedCompany.name}`;

    await sendNotificationLogic({
      senderId: req.user._id,
      message
    });

    await logAudit({
      userId: req.user._id,
      userName: findUser.name,
      action: `Update InsuranceCompany by ${findUser.name}`,
      entity: "InsuranceCompany",
      entityId: updatedCompany._id,
      oldValue,
      newValue: updatedCompany
    });

    res.status(200).json({
      message: "Insurance company updated successfully!",
      company: updatedCompany
    });

  } catch (error) {
    next(error);
  }
};



export const deleteInsuranceCompany = async (req, res, next) => {
  try {
    const { id } = req.params;

    const deletedCompany = await InsuranceCompany.findByIdAndDelete(id);
    if (!deletedCompany) {
      return res.status(404).json({ message: "Insurance company not found!" });
    }

    const user = req.user;
    const message = `${user.name} delete insurance company `
    await sendNotificationLogic({
      senderId: req.user._id,
      message
    })

    await logAudit({
      userId: user._id,
      userName: user.name,
      action: `Delete InsuranceCompany by ${user.name}`,
      entity: "InsuranceCompany",
      entityId: deletedCompany._id,
      oldValue: deletedCompany,
      newValue: null
    });

    res.status(200).json({ message: "Insurance company deleted successfully!" });

  } catch (error) {
    next(error);
  }
};


export const getAllInsuranceCompanies = async (req, res, next) => {
  try {
    const companies = await InsuranceCompany.find()
      .populate('insuranceTypes', 'name')
      .populate('roadServices', 'name price');
    res.status(200).json(companies);
  } catch (error) {

    next(error);
  }
};

/**
 * Get insurance company by ID
 * GET /api/v1/company/:id
 */
export const getInsuranceCompanyById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const company = await InsuranceCompany.findById(id)
      .populate('insuranceTypes', 'name description')
      .populate('roadServices', 'service_name normal_price old_car_price cutoff_year description is_active');

    if (!company) {
      return res.status(404).json({ message: "Insurance company not found" });
    }

    return res.status(200).json({
      message: "Insurance company retrieved successfully",
      company
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Get insurance companies by insurance type
 * GET /api/v1/company/by-type/:insuranceTypeId
 */
export const getCompaniesByInsuranceType = async (req, res, next) => {
  try {
    const { insuranceTypeId } = req.params;

    // Verify insurance type exists
    const insuranceType = await InsuranceTypeModel.findById(insuranceTypeId);
    if (!insuranceType) {
      return res.status(404).json({ message: "Insurance type not found" });
    }

    // Find all companies that have this insurance type
    const companies = await InsuranceCompany.find({
      insuranceTypes: insuranceTypeId
    })
      .populate('insuranceTypes', 'name description pricing_type_id')
      .populate('roadServices', 'service_name normal_price old_car_price cutoff_year description is_active');

    return res.status(200).json({
      message: "Insurance companies retrieved successfully",
      insuranceType: {
        _id: insuranceType._id,
        name: insuranceType.name,
        description: insuranceType.description
      },
      count: companies.length,
      companies
    });

  } catch (error) {
    next(error);
  }
};
