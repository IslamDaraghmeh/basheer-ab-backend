import { Router } from "express";
import * as smsController from "./controller/sms.controller.js";

const smsRouter = Router();

// Send single SMS
smsRouter.post("/send", smsController.sendSMS);

// Send bulk SMS
smsRouter.post("/send-bulk", smsController.sendBulkSMS);

// Test SMS configuration
smsRouter.post("/test", smsController.testSMS);

// Get SMS service status
smsRouter.get("/status", smsController.getStatus);

// Get all SMS records with pagination
smsRouter.get("/all", smsController.getAllSMS);

// Get SMS statistics
smsRouter.get("/stats", smsController.getSMSStats);

// Get SMS by ID
smsRouter.get("/:id", smsController.getSMSById);

// Delete SMS
smsRouter.delete("/:id", smsController.deleteSMS);

export default smsRouter;
