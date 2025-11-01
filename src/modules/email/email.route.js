import { Router } from "express";
import * as emailController from "./controller/email.controller.js";

const emailRouter = Router();

// Get inbox from Gmail with pagination
emailRouter.get("/inbox", emailController.getInbox);

// Get all emails from database with pagination
emailRouter.get("/all", emailController.list);

// Get single email by ID
emailRouter.get("/:id", emailController.getEmailById);

// Send single email
emailRouter.post("/send", emailController.sendEmail);

// Send bulk emails
emailRouter.post("/send-bulk", emailController.sendBulkEmail);

// Delete email
emailRouter.delete("/:id", emailController.deleteEmail);

export default emailRouter;
