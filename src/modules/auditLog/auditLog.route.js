import { Router } from "express";
import * as auditsRoute from './controller/auditLog.controller.js'
const auditsRouter=Router();
auditsRouter.get('/all',auditsRoute.list)
export default auditsRouter;