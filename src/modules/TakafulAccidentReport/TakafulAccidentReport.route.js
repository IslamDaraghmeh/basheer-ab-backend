import { Router } from "express";
import * as TakafulAccidentReportRoute from './controller/TakafulAccidentReport.controller.js'
import { auth } from "../../middleware/auth.js";
import { endPoints } from "./TakafulAccidentReport.endpoint.js";

const TakafulAccidentReportRouter=Router();
TakafulAccidentReportRouter.post('/add/:plateNumber',auth(endPoints.addTakafulAccidentReport),TakafulAccidentReportRoute.addAccidentReport)
TakafulAccidentReportRouter.delete('/delete/:id',auth(endPoints.deleteTakafulAccidentReport),TakafulAccidentReportRoute.deleteAccidentReport)
TakafulAccidentReportRouter.get('/all',auth(endPoints.showTakafulAccidentReport),TakafulAccidentReportRoute.findAll)
TakafulAccidentReportRouter.get('/allById/:id',auth(endPoints.showTakafulAccidentReport),TakafulAccidentReportRoute.findById)
export default TakafulAccidentReportRouter