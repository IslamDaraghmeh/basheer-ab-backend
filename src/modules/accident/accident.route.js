import { Router } from "express";
import { auth } from "../../middleware/auth.js";
import { endPoints } from "./accident.endpoint.js";
import * as accidentRoute from './controller/accident.controller.js'
import { fileValidation, myMulter } from "../../services/multer.js";

const accidentRouter = Router();

// Get all accidents with pagination
accidentRouter.get('/all', auth(endPoints.allAccident), accidentRoute.getAllAccidentsWithPagination)

// Legacy endpoints (kept for backward compatibility)
accidentRouter.post('/addAccident/:insuredId/:vehicleId', auth(endPoints.addAccident), myMulter(fileValidation.imag).array('image'), accidentRoute.create)
accidentRouter.get('/getAccident/:insuredId/:vehicleId', auth(endPoints.allAccident), accidentRoute.list)
accidentRouter.delete('/deleteAccident/:id', auth(endPoints.deleteAccident), accidentRoute.deleteAccident)
accidentRouter.patch('/updateAccident/:id', auth(endPoints.updateAccident), accidentRoute.updateAccident)

// Statistics & Reports
accidentRouter.get('/totalAccidents', auth(endPoints.allAccident), accidentRoute.count)
accidentRouter.get('/accidentReport', auth(endPoints.allAccident), accidentRoute.accidentReport)
accidentRouter.get('/stats', auth(endPoints.allAccident), accidentRoute.getAccidentStats)

// New ticketing system endpoints
// Get by ticket number
accidentRouter.get('/ticket/:ticketNumber', auth(endPoints.allAccident), accidentRoute.getAccidentByTicketNumber)

// Status management
accidentRouter.patch('/status/:id', auth(endPoints.updateStatus), accidentRoute.updateAccidentStatus)

// Assignment
accidentRouter.patch('/assign/:id', auth(endPoints.assignAccident), accidentRoute.assignAccident)

// Comments/Replies
accidentRouter.post('/comment/:accidentId', auth(endPoints.addComment), myMulter(fileValidation.imag).array('image'), accidentRoute.addComment)
accidentRouter.get('/comments/:accidentId', auth(endPoints.getComments), accidentRoute.getComments)

export default accidentRouter;