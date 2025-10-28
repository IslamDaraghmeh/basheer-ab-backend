import { roles } from "../../services/roles.js";

export const endpoints={
    addTrustAccidentReport:[roles.Admin,roles.Employee,roles.HeadOfEmployee],
    deleteTrustAccidentReport:[roles.Admin,roles.Employee,roles.HeadOfEmployee],
  
    showTrustAccidentReport:[roles.Admin,roles.Employee,roles.HeadOfEmployee],
}