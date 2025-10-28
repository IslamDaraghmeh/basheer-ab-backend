import { roles } from "../../services/roles.js";

export const endpoints = {
  addService: [roles.Admin, roles.Employee, roles.HeadOfEmployee],
  updateService: [roles.Admin, roles.Employee, roles.HeadOfEmployee],
  deleteService: [roles.Admin, roles.HeadOfEmployee],
  allServices: [roles.Admin, roles.Employee, roles.HeadOfEmployee]
};
