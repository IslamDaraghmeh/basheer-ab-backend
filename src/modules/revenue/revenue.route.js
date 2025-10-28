import { Router } from "express";
import * as revenueRoute from './controller/revenue.controller.js';

const revenueRouter = Router();
revenueRouter.post('/transferInsurance/:insuredId/:fromVehicleId/:toVehicleId/:insuranceId', revenueRoute.transferInsurance)
revenueRouter.get('/getCustomerPaymentsReport',revenueRoute.getCustomerPaymentsReport)
//revenueRouter.get('/getTransferredInsurancesReport',revenueRoute.getTransferredInsurancesReport)
revenueRouter.get('/getCancelledInsurancesReport',revenueRoute.getCancelledInsurancesReport)

export default revenueRouter;