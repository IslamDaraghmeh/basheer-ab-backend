import { roles } from "../../services/roles.js";
export const endPoints={

   prof:[roles.Admin,roles.Insured,roles.Agents,roles.HeadOfEmployee],
    addHeadOfDepartmentToDepartment:[roles.Admin],
    deleteHeadOfDepartmentToDepartment:[roles.Admin],
    getHeadOfDepartment:[roles.Admin],
    addEmployee:[roles.Admin , roles.HeadOfEmployee],
    deleteEmployee:[roles.Admin , roles.HeadOfEmployee],
    updateEmployee:[roles.Admin , roles.HeadOfEmployee],
    allEmployee:[roles.Admin , roles.HeadOfEmployee],
    resetEmployeePassword:[roles.Admin],

}