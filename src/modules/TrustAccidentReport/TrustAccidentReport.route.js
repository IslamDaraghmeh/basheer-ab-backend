import { Router } from "express";
import * as TrustAccidentReportRouterRoute from './controller/TrustAccidentReport.controller.js'
import { auth } from "../../middleware/auth.js";
import { endpoints } from "./TrustAccidentReport.endpoint.js";

const TrustAccidentReportRouter=Router();
TrustAccidentReportRouter.post('/add/:plateNumber',auth(endpoints.addTrustAccidentReport),TrustAccidentReportRouterRoute.addAccedentReport)
TrustAccidentReportRouter.delete('/delete/:id',auth(endpoints.deleteTrustAccidentReport),TrustAccidentReportRouterRoute.deleteAccidentReport)
TrustAccidentReportRouter.get('/all',auth(endpoints.showTrustAccidentReport),TrustAccidentReportRouterRoute.findAll)
TrustAccidentReportRouter.get('/allById/:id',auth(endpoints.showTrustAccidentReport),TrustAccidentReportRouterRoute.findById)
export default TrustAccidentReportRouter;