import { roles } from "../../services/roles.js";

export const endpoints={
    addPalestineAccidentReport:[roles.Admin,roles.Employee,roles.HeadOfEmployee],
    deletePalestineAccidentReport:[roles.Admin,roles.Employee,roles.HeadOfEmployee],
  
    showPalestineAccidentReport:[roles.Admin,roles.Employee,roles.HeadOfEmployee],
}