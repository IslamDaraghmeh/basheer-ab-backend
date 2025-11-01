import { Router } from "express";
import * as HolyLandsReportRoute from './controller/HolyLandsReport.controller.js'
import { auth } from "../../middleware/auth.js";
import { endpoints } from "./HolyLandsReport.endpoint.js";

const HolyLandsReportRouter=Router();
HolyLandsReportRouter.post('/add/:plateNumber',auth(endpoints.addHolyAccidentReport),HolyLandsReportRoute.create)
HolyLandsReportRouter.delete('/delete/:id',auth(endpoints.deleteHoliAccidentReport),HolyLandsReportRoute.deleteAccidentReport)
HolyLandsReportRouter.get('/all',auth(endpoints.showHoliAccidentReport),HolyLandsReportRoute.list)
HolyLandsReportRouter.get('/allbyid/:id',auth(endpoints.showHoliAccidentReport),HolyLandsReportRoute.getById)
export default HolyLandsReportRouter;