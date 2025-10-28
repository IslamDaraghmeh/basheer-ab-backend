import { Router } from "express";
import { auth } from "../../middleware/auth.js";
import * as chequeController from "./controller/cheque.controller.js";
import { fileValidation, myMulter } from "../../services/multer.js";
import { cacheMiddleware } from "../../middleware/cacheMiddleware.js";

const chequeRouter = Router();

// Add general cheque for a customer
chequeRouter.post(
  "/customer/:customerId",
  auth(),
  myMulter(fileValidation.imag).single("chequeImage"),
  chequeController.addCheque
);

// Add cheque to an insurance payment
chequeRouter.post(
  "/insurance/:insuranceId",
  auth(),
  myMulter(fileValidation.imag).single("chequeImage"),
  chequeController.addChequeToInsurance
);

// Get all cheques with filters (cached for 5 minutes)
chequeRouter.get(
  "/all",
  auth(),
  cacheMiddleware(300),
  chequeController.getAllCheques
);

// Get cheque statistics (cached for 10 minutes)
chequeRouter.get(
  "/statistics",
  auth(),
  cacheMiddleware(600),
  chequeController.getChequeStatistics
);

// Get single cheque by ID
chequeRouter.get(
  "/:chequeId",
  auth(),
  chequeController.getChequeById
);

// Get cheques for specific customer
chequeRouter.get(
  "/customer/:customerId",
  auth(),
  chequeController.getCustomerCheques
);

// Update cheque status
chequeRouter.patch(
  "/:chequeId/status",
  auth(),
  chequeController.updateChequeStatus
);

// Delete cheque
chequeRouter.delete(
  "/:chequeId",
  auth(),
  chequeController.deleteCheque
);

export default chequeRouter;
