import { roles } from "../../services/roles.js";

export const endpoints={
    addHolyAccidentReport:[roles.Admin,roles.Employee,roles.HeadOfEmployee],
    deleteHoliAccidentReport:[roles.Admin,roles.Employee,roles.HeadOfEmployee],
  
    showHoliAccidentReport:[roles.Admin,roles.Employee,roles.HeadOfEmployee],
}