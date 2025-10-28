import { roles } from "../../services/roles.js";

export const endpoints={
    addAl_MashreqAccidentReport:[roles.Admin,roles.Employee,roles.HeadOfEmployee],
    deleteAl_MashreqAccidentReport:[roles.Admin,roles.Employee,roles.HeadOfEmployee],
  
    showAl_MashreqAccidentReport:[roles.Admin,roles.Employee,roles.HeadOfEmployee],
}