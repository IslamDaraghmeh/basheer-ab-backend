import { roles } from "../../services/roles.js";

export const endpoints = {
  addType: [roles.Admin, roles.Employee, roles.HeadOfEmployee],
  updateType: [roles.Admin, roles.Employee, roles.HeadOfEmployee],
  deleteType: [roles.Admin, roles.HeadOfEmployee],
  allTypes: [roles.Admin, roles.Employee, roles.HeadOfEmployee]
};
