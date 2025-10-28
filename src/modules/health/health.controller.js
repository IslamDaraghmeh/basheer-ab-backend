import mongoose from "mongoose";
import logger from "../../utils/logService.js";

/**
 * Basic health check endpoint
 * Returns application status and uptime
 */
export const healthCheck = async (req, res) => {
  try {
    const healthStatus = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
    };

    return res.status(200).json(healthStatus);
  } catch (error) {
    logger.error("Health check failed:", error);
    return res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
};

/**
 * Detailed health check with database connectivity
 * Checks MongoDB connection status
 */
export const detailedHealthCheck = async (req, res) => {
  try {
    const healthData = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      services: {},
    };

    // Check MongoDB connection
    const dbState = mongoose.connection.readyState;
    const dbStatus = {
      0: "disconnected",
      1: "connected",
      2: "connecting",
      3: "disconnecting",
    };

    healthData.services.database = {
      status: dbState === 1 ? "healthy" : "unhealthy",
      state: dbStatus[dbState],
      name: mongoose.connection.name || "unknown",
    };

    // Test database with a simple operation
    if (dbState === 1) {
      try {
        await mongoose.connection.db.admin().ping();
        healthData.services.database.ping = "success";
      } catch (pingError) {
        healthData.services.database.ping = "failed";
        healthData.services.database.status = "unhealthy";
        healthData.status = "degraded";
      }
    } else {
      healthData.status = "unhealthy";
    }

    // Memory usage
    const memoryUsage = process.memoryUsage();
    healthData.memory = {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
      external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`,
    };

    const statusCode = healthData.status === "healthy" ? 200 : healthData.status === "degraded" ? 207 : 503;
    return res.status(statusCode).json(healthData);
  } catch (error) {
    logger.error("Detailed health check failed:", error);
    return res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
};

/**
 * Readiness probe - checks if the application is ready to receive traffic
 * Used by orchestration systems like Kubernetes
 */
export const readinessCheck = async (req, res) => {
  try {
    // Check if database is connected
    const dbState = mongoose.connection.readyState;

    if (dbState !== 1) {
      return res.status(503).json({
        ready: false,
        reason: "Database not connected",
        timestamp: new Date().toISOString(),
      });
    }

    // Test database connectivity
    await mongoose.connection.db.admin().ping();

    return res.status(200).json({
      ready: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Readiness check failed:", error);
    return res.status(503).json({
      ready: false,
      reason: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Liveness probe - checks if the application is alive
 * Used by orchestration systems like Kubernetes
 */
export const livenessCheck = async (req, res) => {
  try {
    // Simple check to verify the process is responsive
    return res.status(200).json({
      alive: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Liveness check failed:", error);
    return res.status(503).json({
      alive: false,
      timestamp: new Date().toISOString(),
    });
  }
};
