import { Router } from "express";
import * as insuranceTypeController from './controller/insuranceType.controller.js';
import { auth } from "../../middleware/auth.js";
import { endpoints } from "./insuranceType.endpoint.js";

const insuranceTypeRouter = Router();

insuranceTypeRouter.post('/add', auth(endpoints.addType), insuranceTypeController.create);
insuranceTypeRouter.get('/all', auth(endpoints.allTypes), insuranceTypeController.list);
insuranceTypeRouter.get('/:id', auth(endpoints.allTypes), insuranceTypeController.getInsuranceTypeById);
insuranceTypeRouter.patch('/:id', auth(endpoints.updateType), insuranceTypeController.updateInsuranceType);
insuranceTypeRouter.delete('/:id', auth(endpoints.deleteType), insuranceTypeController.deleteInsuranceType);

export default insuranceTypeRouter;
