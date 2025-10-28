import { roles } from "../../services/roles.js";
export const endPoints={
    addAgents:[roles.Admin , roles.Employee , roles.HeadOfEmployee],
    deleteAgents:[roles.Admin , roles.Employee , roles.HeadOfEmployee],
    updateAgents:[roles.Admin , roles.Employee , roles.HeadOfEmployee],
    allAgents:[roles.Admin , roles.Employee , roles.HeadOfEmployee],
 
}