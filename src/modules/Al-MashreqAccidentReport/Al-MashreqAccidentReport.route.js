import { Router } from "express";
import * as Al_MashreqAccidentReportRoute from './controller/Al-MashreqAccidentReportAl-MashreqAccidentReport.conroller.js'
import { auth } from "../../middleware/auth.js";
import { endpoints } from "./Al-MashreqAccidentReport.endpoint.js";

const Al_MashreqAccidentReportRouter=Router();
Al_MashreqAccidentReportRouter.post('/add/:plateNumber',auth(endpoints.addAl_MashreqAccidentReport),Al_MashreqAccidentReportRoute.addNewAccedentReport)
Al_MashreqAccidentReportRouter.delete('/delete/:id',auth(endpoints.deleteAl_MashreqAccidentReport),Al_MashreqAccidentReportRoute.deleteAccidentReport)
Al_MashreqAccidentReportRouter.get('/all',auth(endpoints.showAl_MashreqAccidentReport),Al_MashreqAccidentReportRoute.findAll)
Al_MashreqAccidentReportRouter.get('/allbyid/:id',auth(endpoints.showAl_MashreqAccidentReport),Al_MashreqAccidentReportRoute.findById)
export default Al_MashreqAccidentReportRouter;