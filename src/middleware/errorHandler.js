import logger from "../utils/logService.js";




const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || "error in server";

    
    logger.error(`${statusCode} - ${message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);

    res.status(statusCode).json({
        success: false,
        message: process.env.NODE_ENV === "development" ? message : "An error occurred, please try again later.",
        error: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
};

export default errorHandler;