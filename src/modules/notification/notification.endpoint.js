import { roles } from "../../services/roles.js";

export const endPoints={
    createNotification:[roles.Admin , roles.Employee , roles.HeadOfEmployee ],
    getNotifications:[roles.Admin , roles.HeadOfEmployee],
    markAsRead:[roles.Admin ,  roles.HeadOfEmployee],
 

}

