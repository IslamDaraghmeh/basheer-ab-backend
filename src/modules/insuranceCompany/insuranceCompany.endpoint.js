import { roles } from "../../services/roles.js";
export const endpoints={
    addCompany:[roles.Admin, roles.Employee, roles.HeadOfEmployee ],
    deleteCompany:[roles.Admin, roles.HeadOfEmployee, roles.Employee],
    upateCompany:[roles.Admin,roles.HeadOfEmployee, roles.Employee],
    allCompany:[roles.Admin,roles.HeadOfEmployee, roles.Employee]
}
