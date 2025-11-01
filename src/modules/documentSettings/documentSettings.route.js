import { Router } from "express";
import { auth } from "../../middleware/auth.js";
import { validation } from "../../middleware/validation.js";
import { myMulter, fileValidation, HME } from "../../services/multer.js";
import {
  endpointsDocumentSettings,
  endpointsRolesDocumentSettings
} from "./documentSettings.endpoint.js";
import * as documentSettingsController from "./controller/documentSettings.controller.js";
import * as documentSettingsValidation from "./documentSettings.validation.js";

const documentSettingsRouter = Router();

// Create document settings with logo upload
documentSettingsRouter.post(
  endpointsDocumentSettings.CREATE_DOCUMENT_SETTINGS,
  auth(endpointsRolesDocumentSettings.CREATE_DOCUMENT_SETTINGS),
  myMulter(fileValidation.imag).single('logo'),
  HME,
  validation(documentSettingsValidation.createDocumentSettings),
  documentSettingsController.createDocumentSettings
);

// Get active document settings
documentSettingsRouter.get(
  endpointsDocumentSettings.GET_ACTIVE_DOCUMENT_SETTINGS,
  auth(endpointsRolesDocumentSettings.GET_ACTIVE_DOCUMENT_SETTINGS),
  documentSettingsController.getActiveDocumentSettings
);

// Get all document settings with pagination
documentSettingsRouter.get(
  endpointsDocumentSettings.GET_ALL_DOCUMENT_SETTINGS,
  auth(endpointsRolesDocumentSettings.GET_ALL_DOCUMENT_SETTINGS),
  validation(documentSettingsValidation.getAllDocumentSettings),
  documentSettingsController.list
);

// Update document settings with optional logo upload (must be before /:id route)
documentSettingsRouter.put(
  endpointsDocumentSettings.UPDATE_DOCUMENT_SETTINGS,
  auth(endpointsRolesDocumentSettings.UPDATE_DOCUMENT_SETTINGS),
  myMulter(fileValidation.imag).single('logo'),
  HME,
  validation(documentSettingsValidation.updateDocumentSettings),
  documentSettingsController.updateDocumentSettings
);

// Activate document settings (must be before /:id route)
documentSettingsRouter.patch(
  endpointsDocumentSettings.ACTIVATE_DOCUMENT_SETTINGS,
  auth(endpointsRolesDocumentSettings.ACTIVATE_DOCUMENT_SETTINGS),
  validation(documentSettingsValidation.activateDocumentSettings),
  documentSettingsController.activateDocumentSettings
);

// Delete document settings (must be before /:id route)
documentSettingsRouter.delete(
  endpointsDocumentSettings.DELETE_DOCUMENT_SETTINGS,
  auth(endpointsRolesDocumentSettings.DELETE_DOCUMENT_SETTINGS),
  validation(documentSettingsValidation.deleteDocumentSettings),
  documentSettingsController.deleteDocumentSettings
);

// Get document settings by ID (must be last among GET routes)
documentSettingsRouter.get(
  endpointsDocumentSettings.GET_DOCUMENT_SETTINGS_BY_ID,
  auth(endpointsRolesDocumentSettings.GET_DOCUMENT_SETTINGS_BY_ID),
  validation(documentSettingsValidation.getDocumentSettingsById),
  documentSettingsController.getDocumentSettingsById
);

export default documentSettingsRouter;