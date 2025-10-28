import { Router } from "express";
import * as PalestineAccidentReportRoute from './controller/PalestineAccidentReport.controller.js'
import { auth } from "../../middleware/auth.js";
import { endpoints } from "./PalestineAccidentReport.endpoint.js";

const PalestineAccidentReportRouter=Router();
PalestineAccidentReportRouter.post('/add/:plateNumber',auth(endpoints.addPalestineAccidentReport),PalestineAccidentReportRoute.addAccedentReport)
PalestineAccidentReportRouter.delete('/delete/:id',auth(endpoints.deletePalestineAccidentReport),PalestineAccidentReportRoute.deleteAccidentReport)
PalestineAccidentReportRouter.get('/all',auth(endpoints.showPalestineAccidentReport),PalestineAccidentReportRoute.findAll)
PalestineAccidentReportRouter.get('/allbyid/:id',auth(endpoints.showPalestineAccidentReport),PalestineAccidentReportRoute.findById)
export default PalestineAccidentReportRouter;