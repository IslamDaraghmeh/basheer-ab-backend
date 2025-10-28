import { createClient } from "redis";
import logger from "./logService.js";

let redisClient = null;
let isRedisConnected = false;

/**
 * Initialize Redis client
 * Redis is optional - application will work without it
 */
export const initRedis = async () => {
  try {
    // Skip Redis if not configured
    if (!process.env.REDIS_URL && !process.env.REDIS_HOST) {
      logger.info("Redis not configured - caching disabled");
      return null;
    }

    const redisUrl = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || "localhost"}:${process.env.REDIS_PORT || 6379}`;

    redisClient = createClient({
      url: redisUrl,
      password: process.env.REDIS_PASSWORD || undefined,
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: (retries) => {
          if (retries > 3) {
            logger.warn("Redis connection failed after 3 retries - disabling cache");
            return false;
          }
          return Math.min(retries * 100, 3000);
        },
      },
    });

    redisClient.on("error", (err) => {
      logger.error("Redis Client Error:", err);
      isRedisConnected = false;
    });

    redisClient.on("connect", () => {
      logger.info("Redis client connected");
      isRedisConnected = true;
    });

    redisClient.on("ready", () => {
      logger.info("Redis client ready");
      isRedisConnected = true;
    });

    redisClient.on("end", () => {
      logger.warn("Redis client disconnected");
      isRedisConnected = false;
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.error("Failed to initialize Redis:", error);
    isRedisConnected = false;
    return null;
  }
};

/**
 * Get data from Redis cache
 * Returns null if Redis is not available or key doesn't exist
 */
export const getCache = async (key) => {
  try {
    if (!isRedisConnected || !redisClient) {
      return null;
    }

    const data = await redisClient.get(key);
    if (data) {
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    logger.error(`Redis GET error for key ${key}:`, error);
    return null;
  }
};

/**
 * Set data in Redis cache
 * TTL in seconds (default: 5 minutes)
 */
export const setCache = async (key, value, ttl = 300) => {
  try {
    if (!isRedisConnected || !redisClient) {
      return false;
    }

    await redisClient.setEx(key, ttl, JSON.stringify(value));
    return true;
  } catch (error) {
    logger.error(`Redis SET error for key ${key}:`, error);
    return false;
  }
};

/**
 * Delete specific key from cache
 */
export const deleteCache = async (key) => {
  try {
    if (!isRedisConnected || !redisClient) {
      return false;
    }

    await redisClient.del(key);
    return true;
  } catch (error) {
    logger.error(`Redis DELETE error for key ${key}:`, error);
    return false;
  }
};

/**
 * Delete all keys matching a pattern
 * Example: deleteCachePattern('insured:*')
 */
export const deleteCachePattern = async (pattern) => {
  try {
    if (!isRedisConnected || !redisClient) {
      return false;
    }

    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
      logger.info(`Deleted ${keys.length} cache keys matching pattern: ${pattern}`);
    }
    return true;
  } catch (error) {
    logger.error(`Redis DELETE PATTERN error for ${pattern}:`, error);
    return false;
  }
};

/**
 * Check if Redis is available
 */
export const isRedisAvailable = () => {
  return isRedisConnected && redisClient !== null;
};

/**
 * Close Redis connection
 */
export const closeRedis = async () => {
  try {
    if (redisClient) {
      await redisClient.quit();
      logger.info("Redis connection closed");
    }
  } catch (error) {
    logger.error("Error closing Redis connection:", error);
  }
};

export default {
  initRedis,
  getCache,
  setCache,
  deleteCache,
  deleteCachePattern,
  isRedisAvailable,
  closeRedis,
};
