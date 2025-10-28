import { roles } from "../../services/roles.js";

export const endpointsDocumentSettings = {
  CREATE_DOCUMENT_SETTINGS: "/create",
  GET_ACTIVE_DOCUMENT_SETTINGS: "/active",
  GET_ALL_DOCUMENT_SETTINGS: "/",
  GET_DOCUMENT_SETTINGS_BY_ID: "/:id",
  UPDATE_DOCUMENT_SETTINGS: "/update/:id",
  DELETE_DOCUMENT_SETTINGS: "/delete/:id",
  ACTIVATE_DOCUMENT_SETTINGS: "/activate/:id",
};

export const endpointsRolesDocumentSettings = {
  CREATE_DOCUMENT_SETTINGS: [roles.Admin, roles.Employee],
  GET_ACTIVE_DOCUMENT_SETTINGS: [roles.Admin, roles.Employee],
  GET_ALL_DOCUMENT_SETTINGS: [roles.Admin, roles.Employee],
  GET_DOCUMENT_SETTINGS_BY_ID: [roles.Admin, roles.Employee],
  UPDATE_DOCUMENT_SETTINGS: [roles.Admin, roles.Employee],
  DELETE_DOCUMENT_SETTINGS: [roles.Admin, roles.Employee],
  ACTIVATE_DOCUMENT_SETTINGS: [roles.Admin, roles.Employee],
};
