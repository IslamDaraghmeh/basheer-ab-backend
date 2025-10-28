import { Router } from "express";
import * as healthController from "./health.controller.js";

const healthRouter = Router();

// Basic health check - lightweight endpoint
healthRouter.get("/", healthController.healthCheck);

// Detailed health check - includes database and memory info
healthRouter.get("/detailed", healthController.detailedHealthCheck);

// Kubernetes-style probes
healthRouter.get("/readiness", healthController.readinessCheck);
healthRouter.get("/liveness", healthController.livenessCheck);

export default healthRouter;
