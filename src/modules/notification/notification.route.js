import { Router } from "express";
import { auth } from "../../middleware/auth.js";
import { endPoints } from "./notification.endpoint.js";
import * as notificationRoute from './controller/notification.controller.js'
import  {checkDepartmentPermission}  from "../../middleware/checkDepartmentPermission.js";
const NotificationRouter=Router();
NotificationRouter.post('/create',auth(endPoints.createNotification), notificationRoute.createNotification)
NotificationRouter.get('/all',auth(endPoints.getNotifications),notificationRoute.getNotifications)
NotificationRouter.patch('/markAsRead/:notificationId',auth(endPoints.markAsRead),notificationRoute.markAsRead)
//NotificationRouter.delete('/deleteNotification/:notificationId',auth(endPoints.Deletenotification),notificationRoute.deleteNotification)
NotificationRouter.put('/markAllAsRead',auth(endPoints.markAsRead),notificationRoute.markAllAsRead)
export default NotificationRouter