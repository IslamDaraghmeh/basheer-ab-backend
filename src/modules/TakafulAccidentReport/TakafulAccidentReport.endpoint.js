import { roles } from "../../services/roles.js";

export const endPoints={
  addTakafulAccidentReport:[roles.Admin,roles.Employee,roles.HeadOfEmployee],
  deleteTakafulAccidentReport:[roles.Admin,roles.Employee,roles.HeadOfEmployee],

  showTakafulAccidentReport:[roles.Admin,roles.Employee,roles.HeadOfEmployee],

}