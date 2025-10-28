import { roles } from "../../services/roles.js";

export const endpoints={
    addAhliaAccidentReport:[roles.Admin,roles.Employee,roles.HeadOfEmployee],
    deleteAhliaAccidentReport:[roles.Admin,roles.Employee,roles.HeadOfEmployee],
  
    showAhliaAccidentReport:[roles.Admin,roles.Employee,roles.HeadOfEmployee],
}