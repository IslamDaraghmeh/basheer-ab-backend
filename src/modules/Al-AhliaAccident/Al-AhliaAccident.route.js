import { Router } from "express";
import * as AlAhliaAccidentRoute from './controller/Al-AhliaAccident.controller.js'
import { auth } from "../../middleware/auth.js";
import { endpoints } from "./Al-AhliaAccident.endpoint.js";

const AlAhliaAccidentRouter=Router();
AlAhliaAccidentRouter.post('/add/:plateNumber',auth(endpoints.addAhliaAccidentReport),AlAhliaAccidentRoute.addNewAccedentReport)
AlAhliaAccidentRouter.delete('/delete/:id',auth(endpoints.deleteAhliaAccidentReport),AlAhliaAccidentRoute.deleteAccidentReport)
AlAhliaAccidentRouter.get('/all',auth(endpoints.showAhliaAccidentReport),AlAhliaAccidentRoute.findAll)
AlAhliaAccidentRouter.get('/allbyid/:id',auth(endpoints.showAhliaAccidentReport),AlAhliaAccidentRoute.findById)
export default AlAhliaAccidentRouter;