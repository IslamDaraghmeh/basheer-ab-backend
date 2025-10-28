import DocumentSettings from "../../../../DB/models/DocumentSettings.model.js";
import { uploadToCloudinary } from "../../../utils/cloudinary.js";

// Create new document settings
export const createDocumentSettings = async (req, res, next) => {
  try {
    const { companyName, header, footer, documentTemplate } = req.body;
    const userId = req.user._id;

    // Handle logo upload if present
    let logoUrl = null;
    if (req.file) {
      const result = await uploadToCloudinary(req.file.path, {
        folder: "document-settings/logos",
        resource_type: "image"
      });
      logoUrl = result.secure_url;
    }

    const documentSettings = new DocumentSettings({
      companyName,
      logo: logoUrl,
      header: header || {},
      footer: footer || {},
      documentTemplate: documentTemplate || {},
      createdBy: userId,
      updatedBy: userId
    });

    await documentSettings.save();

    res.status(201).json({
      message: "Document settings created successfully",
      data: documentSettings
    });
  } catch (error) {
    next(error);
  }
};

// Get active document settings
export const getActiveDocumentSettings = async (req, res, next) => {
  try {
    const documentSettings = await DocumentSettings.findOne({ isActive: true })
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!documentSettings) {
      return res.status(404).json({ message: "No active document settings found" });
    }

    res.status(200).json({
      message: "Active document settings retrieved successfully",
      data: documentSettings
    });
  } catch (error) {
    next(error);
  }
};

// Get all document settings
export const getAllDocumentSettings = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const documentSettings = await DocumentSettings.find()
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await DocumentSettings.countDocuments();

    res.status(200).json({
      message: "Document settings retrieved successfully",
      data: documentSettings,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get document settings by ID
export const getDocumentSettingsById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const documentSettings = await DocumentSettings.findById(id)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!documentSettings) {
      return res.status(404).json({ message: "Document settings not found" });
    }

    res.status(200).json({
      message: "Document settings retrieved successfully",
      data: documentSettings
    });
  } catch (error) {
    next(error);
  }
};

// Update document settings
export const updateDocumentSettings = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { companyName, header, footer, documentTemplate, isActive } = req.body;
    const userId = req.user._id;

    const documentSettings = await DocumentSettings.findById(id);
    if (!documentSettings) {
      return res.status(404).json({ message: "Document settings not found" });
    }

    // Handle logo upload if present
    let logoUrl = documentSettings.logo;
    if (req.file) {
      const result = await uploadToCloudinary(req.file.path, {
        folder: "document-settings/logos",
        resource_type: "image"
      });
      logoUrl = result.secure_url;
    }

    // Update fields
    if (companyName !== undefined) documentSettings.companyName = companyName;
    if (logoUrl !== documentSettings.logo) documentSettings.logo = logoUrl;
    if (header !== undefined) documentSettings.header = { ...documentSettings.header, ...header };
    if (footer !== undefined) documentSettings.footer = { ...documentSettings.footer, ...footer };
    if (documentTemplate !== undefined) documentSettings.documentTemplate = { ...documentSettings.documentTemplate, ...documentTemplate };
    if (isActive !== undefined) documentSettings.isActive = isActive;

    documentSettings.updatedBy = userId;

    await documentSettings.save();

    res.status(200).json({
      message: "Document settings updated successfully",
      data: documentSettings
    });
  } catch (error) {
    next(error);
  }
};

// Delete document settings
export const deleteDocumentSettings = async (req, res, next) => {
  try {
    const { id } = req.params;

    const documentSettings = await DocumentSettings.findById(id);
    if (!documentSettings) {
      return res.status(404).json({ message: "Document settings not found" });
    }

    // Don't allow deletion of active settings
    if (documentSettings.isActive) {
      return res.status(400).json({
        message: "Cannot delete active document settings. Please activate another setting first."
      });
    }

    await DocumentSettings.findByIdAndDelete(id);

    res.status(200).json({
      message: "Document settings deleted successfully"
    });
  } catch (error) {
    next(error);
  }
};

// Activate document settings
export const activateDocumentSettings = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const documentSettings = await DocumentSettings.findById(id);
    if (!documentSettings) {
      return res.status(404).json({ message: "Document settings not found" });
    }

    // Deactivate all other settings and activate this one
    await DocumentSettings.updateMany({ _id: { $ne: id } }, { isActive: false });

    documentSettings.isActive = true;
    documentSettings.updatedBy = userId;
    await documentSettings.save();

    res.status(200).json({
      message: "Document settings activated successfully",
      data: documentSettings
    });
  } catch (error) {
    next(error);
  }
};