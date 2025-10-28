import jwt from "jsonwebtoken";
import { userModel } from "../../DB/models/user.model.js";
import logger from "../utils/logService.js";

export const auth = (acessRole = []) => {
  return async (req, res, next) => {
    try {
      const { token } = req.headers;

      // Check if token exists
      if (!token) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Validate token format
      if (!token.startsWith(process.env.authBearerToken)) {
        return res.status(401).json({ message: "Invalid authentication format" });
      }

      // Extract and verify JWT token
      const newToken = token.split(process.env.authBearerToken)[1];

      if (!newToken) {
        return res.status(401).json({ message: "Invalid token format" });
      }

      const decoded = jwt.verify(newToken, process.env.TokenSignIn);

      // Verify user exists
      const user = await userModel.findById(decoded.id);
      if (!user) {
        return res.status(401).json({ message: "User not found or invalid token" });
      }

      // Check role authorization
      if (acessRole.length > 0 && !acessRole.includes(user.role)) {
        logger.warn(`Unauthorized access attempt by user ${user._id} with role ${user.role}`);
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      req.user = user;
      next();
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: "Invalid token" });
      }
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: "Token expired" });
      }

      logger.error(`Authentication error: ${error.message}`);
      return res.status(500).json({ message: "Authentication failed" });
    }
  };
};
