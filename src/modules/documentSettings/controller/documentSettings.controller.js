import DocumentSettings from "#db/models/DocumentSettings.model.js";
import { uploadToLocal } from "#utils/fileUpload.js";
import logger from "#utils/logService.js";
import { asyncHandler } from "#utils/asyncHandler.js";
import { logAudit } from "#utils/auditLogger.js";
import {
  successResponse,
  createdResponse,
  notFoundResponse,
  badRequestResponse
} from "#utils/apiResponse.js";

// Create new document settings
export const createDocumentSettings = asyncHandler(async (req, res) => {
  const { companyName, header, footer, documentTemplate } = req.body;
  const userId = req.user._id;

  // Handle logo upload if present
  let logoUrl = null;
  if (req.file) {
    const result = await uploadToLocal(req.file.path, {
      folder: "document-settings/logos"
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

  logger.info("Document settings created", {
    userId,
    companyName,
    hasLogo: !!logoUrl
  });

  return createdResponse(res, { data: documentSettings }, "Document settings created successfully");
});

// Get active document settings
export const getActiveDocumentSettings = asyncHandler(async (req, res) => {
  const documentSettings = await DocumentSettings.findOne({ isActive: true })
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

  if (!documentSettings) {
    return notFoundResponse(res, "No active document settings");
  }

  logger.info("Active document settings retrieved", {
    settingsId: documentSettings._id
  });

  return successResponse(res, { data: documentSettings }, "Active document settings retrieved successfully");
});

// Get all document settings
export const list = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  const documentSettings = await DocumentSettings.find()
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await DocumentSettings.countDocuments();

  logger.info("Document settings list retrieved", {
    page,
    limit,
    total
  });

  return successResponse(res, {
    data: documentSettings,
    pagination: {
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      itemsPerPage: parseInt(limit)
    }
  }, "Document settings retrieved successfully");
});

// Get document settings by ID
export const getDocumentSettingsById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const documentSettings = await DocumentSettings.findById(id)
    .populate("createdBy", "name email")
    .populate("updatedBy", "name email");

  if (!documentSettings) {
    return notFoundResponse(res, "Document settings");
  }

  logger.info("Document settings retrieved by ID", { settingsId: id });

  return successResponse(res, { data: documentSettings }, "Document settings retrieved successfully");
});

// Update document settings
export const updateDocumentSettings = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { companyName, header, footer, documentTemplate, isActive } = req.body;
  const userId = req.user._id;

  const documentSettings = await DocumentSettings.findById(id);
  if (!documentSettings) {
    return notFoundResponse(res, "Document settings");
  }

  // Handle logo upload if present
  let logoUrl = documentSettings.logo;
  if (req.file) {
    const result = await uploadToLocal(req.file.path, {
      folder: "document-settings/logos"
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

  logger.info("Document settings updated", {
    settingsId: id,
    userId,
    updatedFields: Object.keys(req.body)
  });

  return successResponse(res, { data: documentSettings }, "Document settings updated successfully");
});

// Delete document settings
export const deleteDocumentSettings = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const documentSettings = await DocumentSettings.findById(id);
  if (!documentSettings) {
    return notFoundResponse(res, "Document settings");
  }

  // Don't allow deletion of active settings
  if (documentSettings.isActive) {
    return badRequestResponse(res, "Cannot delete active document settings. Please activate another setting first.");
  }

  await DocumentSettings.findByIdAndDelete(id);

  logger.info("Document settings deleted", { settingsId: id });

  return successResponse(res, null, "Document settings deleted successfully");
});

// Activate document settings
export const activateDocumentSettings = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const documentSettings = await DocumentSettings.findById(id);
  if (!documentSettings) {
    return notFoundResponse(res, "Document settings");
  }

  // Deactivate all other settings and activate this one
  await DocumentSettings.updateMany({ _id: { $ne: id } }, { isActive: false });

  documentSettings.isActive = true;
  documentSettings.updatedBy = userId;
  await documentSettings.save();

  logger.info("Document settings activated", {
    settingsId: id,
    userId
  });

  return successResponse(res, { data: documentSettings }, "Document settings activated successfully");
});
