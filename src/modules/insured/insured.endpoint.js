import { roles } from "../../services/roles.js"
export const endPoints={
    addInsured:[roles.Admin , roles.Employee , roles.HeadOfEmployee ],
    deleteInsured:[roles.Admin , roles.Employee , roles.HeadOfEmployee],
    updateInsured:[roles.Admin , roles.HeadOfEmployee],
    allInsured:[roles.Admin , roles.HeadOfEmployee , roles.Employee],
    findInsuredById:[roles.Admin , roles.HeadOfEmployee , roles.Employee],
    searchCustomer:[roles.Admin , roles.HeadOfEmployee , roles.Employee],
    addcar:[roles.Admin,roles.HeadOfEmployee , roles.Employee],
    removeCar:[roles.Admin , roles.HeadOfEmployee , roles.Employee],
    showVehicles:[roles.Admin , roles.HeadOfEmployee , roles.Employee],
    updateCar:[roles.Admin, roles.HeadOfEmployee]
}