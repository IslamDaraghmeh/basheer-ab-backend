import { Router } from "express";
import { auth } from "../../middleware/auth.js";
import * as pricingController from "./controller/insuranceCompanyPricing.controller.js";

const insuranceCompanyPricingRouter = Router();

// Create or update pricing for a company
insuranceCompanyPricingRouter.post(
  "/:companyId",
  auth(["admin"]),
  pricingController.createOrUpdatePricing
);

// Get all pricing configurations
insuranceCompanyPricingRouter.get(
  "/all",
  auth(),
  pricingController.getAllPricing
);

// Get pricing by company
insuranceCompanyPricingRouter.get(
  "/company/:companyId",
  auth(),
  pricingController.getPricingByCompany
);

// Get specific pricing configuration
insuranceCompanyPricingRouter.get(
  "/:companyId/:pricingTypeId",
  auth(),
  pricingController.getSpecificPricing
);

// Calculate price based on pricing rules
insuranceCompanyPricingRouter.post(
  "/calculate",
  auth(),
  pricingController.calculatePrice
);

// Delete pricing configuration
insuranceCompanyPricingRouter.delete(
  "/:companyId/:pricingTypeId",
  auth(["admin"]),
  pricingController.deletePricing
);

export default insuranceCompanyPricingRouter;
