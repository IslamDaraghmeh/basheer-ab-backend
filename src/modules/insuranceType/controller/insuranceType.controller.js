import { InsuranceTypeModel } from "../../../../DB/models/InsuranceType.model.js";
import PricingTypeModel from "../../../../DB/models/PricingType.model.js";
import AuditLogModel from "../../../../DB/models/AuditLog.model.js";
import { userModel } from "../../../../DB/models/User.model.js";
import { sendNotificationLogic } from "../../notification/controller/notification.controller.js";

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

// Create Insurance Type
export const addInsuranceType = async (req, res, next) => {
  try {
    const { name, pricing_type_id, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Insurance type name is required!" });
    }

    if (!pricing_type_id) {
      return res.status(400).json({ message: "Pricing type ID is required!" });
    }

    // Validate pricing type exists
    const pricingType = await PricingTypeModel.findById(pricing_type_id);
    if (!pricingType) {
      return res.status(404).json({ message: "Invalid pricing type ID!" });
    }

    const existingType = await InsuranceTypeModel.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
    });

    if (existingType) {
      return res.status(409).json({ message: `Insurance type '${name}' already exists!` });
    }

    const newType = new InsuranceTypeModel({
      name: name.trim(),
      pricing_type_id,
      description: description || ""
    });
    await newType.save();

    const findUser = await userModel.findById(req.user._id);
    const message = `${findUser.name} added new insurance type: ${name}`;

    await sendNotificationLogic({
      senderId: req.user._id,
      message
    });

    await logAudit({
      userId: req.user._id,
      userName: findUser.name,
      action: `Create Insurance Type by ${findUser.name}`,
      entity: "InsuranceType",
      entityId: newType._id,
      oldValue: null,
      newValue: newType.toObject()
    });

    res.status(201).json({
      message: "Insurance type added successfully!",
      insuranceType: newType
    });

  } catch (error) {
    next(error);
  }
};

// Get All Insurance Types
export const getAllInsuranceTypes = async (req, res, next) => {
  try {
    const types = await InsuranceTypeModel.find()
      .populate('pricing_type_id', 'name description requiresPricingTable')
      .sort({ name: 1 });
    res.status(200).json({
      count: types.length,
      insuranceTypes: types
    });
  } catch (error) {
    next(error);
  }
};

// Get Insurance Type by ID
export const getInsuranceTypeById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const insuranceType = await InsuranceTypeModel.findById(id)
      .populate('pricing_type_id', 'name description requiresPricingTable');
    if (!insuranceType) {
      return res.status(404).json({ message: "Insurance type not found!" });
    }

    res.status(200).json({ insuranceType });
  } catch (error) {
    next(error);
  }
};

// Update Insurance Type
export const updateInsuranceType = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, pricing_type_id, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Insurance type name is required!" });
    }

    const insuranceType = await InsuranceTypeModel.findById(id);
    if (!insuranceType) {
      return res.status(404).json({ message: "Insurance type not found!" });
    }

    // If pricing_type_id is being updated, validate it
    if (pricing_type_id && pricing_type_id !== insuranceType.pricing_type_id) {
      const pricingType = await PricingTypeModel.findById(pricing_type_id);
      if (!pricingType) {
        return res.status(404).json({ message: "Invalid pricing type ID!" });
      }
    }

    const duplicateType = await InsuranceTypeModel.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
      _id: { $ne: id }
    });

    if (duplicateType) {
      return res.status(409).json({ message: `Insurance type '${name}' already exists!` });
    }

    const oldValue = insuranceType.toObject();

    insuranceType.name = name.trim();
    if (pricing_type_id) insuranceType.pricing_type_id = pricing_type_id;
    if (description !== undefined) insuranceType.description = description;
    await insuranceType.save();

    const findUser = await userModel.findById(req.user._id);
    const message = `${findUser.name} updated insurance type: ${name}`;

    await sendNotificationLogic({
      senderId: req.user._id,
      message
    });

    await logAudit({
      userId: req.user._id,
      userName: findUser.name,
      action: `Update Insurance Type by ${findUser.name}`,
      entity: "InsuranceType",
      entityId: insuranceType._id,
      oldValue,
      newValue: insuranceType.toObject()
    });

    res.status(200).json({
      message: "Insurance type updated successfully!",
      insuranceType
    });

  } catch (error) {
    next(error);
  }
};

// Delete Insurance Type
export const deleteInsuranceType = async (req, res, next) => {
  try {
    const { id } = req.params;

    const insuranceType = await InsuranceTypeModel.findById(id);
    if (!insuranceType) {
      return res.status(404).json({ message: "Insurance type not found!" });
    }

    const oldValue = insuranceType.toObject();
    await InsuranceTypeModel.findByIdAndDelete(id);

    const findUser = await userModel.findById(req.user._id);
    const message = `${findUser.name} deleted insurance type: ${insuranceType.name}`;

    await sendNotificationLogic({
      senderId: req.user._id,
      message
    });

    await logAudit({
      userId: req.user._id,
      userName: findUser.name,
      action: `Delete Insurance Type by ${findUser.name}`,
      entity: "InsuranceType",
      entityId: id,
      oldValue,
      newValue: null
    });

    res.status(200).json({ message: "Insurance type deleted successfully!" });

  } catch (error) {
    next(error);
  }
};
