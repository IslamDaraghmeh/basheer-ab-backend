import { getCache, setCache } from "../utils/redisClient.js";
import logger from "../utils/logService.js";

/**
 * Cache middleware for GET requests
 * Caches the response based on the request URL and query parameters
 *
 * @param {number} ttl - Time to live in seconds (default: 5 minutes)
 * @param {function} keyGenerator - Optional custom key generator function
 * @returns {function} Express middleware
 */
export const cacheMiddleware = (ttl = 300, keyGenerator = null) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== "GET") {
      return next();
    }

    try {
      // Generate cache key
      const cacheKey = keyGenerator
        ? keyGenerator(req)
        : `cache:${req.originalUrl || req.url}`;

      // Try to get cached data
      const cachedData = await getCache(cacheKey);

      if (cachedData) {
        logger.info(`Cache HIT for key: ${cacheKey}`);
        return res.status(200).json({
          ...cachedData,
          _cached: true,
          _cachedAt: new Date(cachedData._timestamp || Date.now()).toISOString(),
        });
      }

      logger.info(`Cache MISS for key: ${cacheKey}`);

      // Store original res.json function
      const originalJson = res.json.bind(res);

      // Override res.json to cache the response
      res.json = function (body) {
        // Only cache successful responses
        if (res.statusCode === 200) {
          const dataToCache = {
            ...body,
            _timestamp: Date.now(),
          };

          // Cache asynchronously (don't wait for it)
          setCache(cacheKey, dataToCache, ttl).catch((err) => {
            logger.error("Failed to cache response:", err);
          });
        }

        // Call original json function
        return originalJson(body);
      };

      next();
    } catch (error) {
      logger.error("Cache middleware error:", error);
      // If caching fails, continue without caching
      next();
    }
  };
};

/**
 * Generate cache key based on user ID and URL
 * Useful for user-specific cached data
 */
export const userCacheKey = (req) => {
  const userId = req.user?._id || "anonymous";
  return `cache:user:${userId}:${req.originalUrl || req.url}`;
};

/**
 * Generate cache key for paginated list endpoints
 * Includes page, limit, and sortBy parameters
 */
export const paginationCacheKey = (req) => {
  const { page = 1, limit = 10, sortBy = "" } = req.query;
  const baseUrl = req.path;
  return `cache:list:${baseUrl}:page${page}:limit${limit}:sort${sortBy}`;
};

/**
 * Generate cache key for report endpoints with filters
 */
export const reportCacheKey = (req) => {
  const { startDate = "", endDate = "", agentName = "", company = "", agent = "" } = req.query;
  const baseUrl = req.path;
  return `cache:report:${baseUrl}:${startDate}-${endDate}:agent${agentName || agent}:company${company}`;
};

export default {
  cacheMiddleware,
  userCacheKey,
  paginationCacheKey,
  reportCacheKey,
};
