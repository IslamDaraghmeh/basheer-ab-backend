import { Router } from "express";
import * as roadServiceController from './controller/roadService.controller.js';
import { auth } from "../../middleware/auth.js";
import { endpoints } from "./roadService.endpoint.js";

const roadServiceRouter = Router();

// Create road service for a company
roadServiceRouter.post(
  '/:companyId',
  auth(endpoints.addService),
  roadServiceController.create
);

// Get all road services
roadServiceRouter.get(
  '/all',
  auth(endpoints.allServices),
  roadServiceController.list
);

// Get road services by company
roadServiceRouter.get(
  '/company/:companyId',
  auth(endpoints.allServices),
  roadServiceController.getRoadServicesByCompany
);

// Calculate road service price
roadServiceRouter.post(
  '/calculate-price',
  auth(),
  roadServiceController.calculateRoadServicePrice
);

// Get single road service
roadServiceRouter.get(
  '/:id',
  auth(endpoints.allServices),
  roadServiceController.getRoadServiceById
);

// Update road service
roadServiceRouter.patch(
  '/:id',
  auth(endpoints.updateService),
  roadServiceController.updateRoadService
);

// Delete road service
roadServiceRouter.delete(
  '/:id',
  auth(endpoints.deleteService),
  roadServiceController.deleteRoadService
);

export default roadServiceRouter;
