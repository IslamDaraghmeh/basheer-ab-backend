import { Router } from "express";
import { auth } from "../../middleware/auth.js";
import * as pricingTypeController from "./controller/pricingType.controller.js";

const pricingTypeRouter = Router();

// Initialize/seed pricing types (admin only)
pricingTypeRouter.post(
  "/initialize",
  auth(["admin"]),
  pricingTypeController.initializePricingTypes
);

// Get all pricing types
pricingTypeRouter.get(
  "/all",
  auth(),
  pricingTypeController.list
);

// Get pricing type by ID
pricingTypeRouter.get(
  "/:typeId",
  auth(),
  pricingTypeController.getPricingTypeById
);

export default pricingTypeRouter;
