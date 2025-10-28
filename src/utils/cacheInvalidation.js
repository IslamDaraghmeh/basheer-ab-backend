import { deleteCachePattern } from "./redisClient.js";
import logger from "./logService.js";

/**
 * Invalidate all insured-related caches
 * Call this after adding, updating, or deleting insured records
 */
export const invalidateInsuredCache = async () => {
  try {
    await Promise.all([
      deleteCachePattern("cache:list:/api/v1/insured*"),
      deleteCachePattern("cache:/api/v1/insured/allInsured*"),
      deleteCachePattern("cache:/api/v1/insured/insurances/all*"),
      deleteCachePattern("cache:report:*"),
    ]);
    logger.info("Invalidated insured cache");
  } catch (error) {
    logger.error("Error invalidating insured cache:", error);
  }
};

/**
 * Invalidate statistics caches
 * Call this after any data changes that affect dashboard statistics
 */
export const invalidateStatsCache = async () => {
  try {
    await Promise.all([
      deleteCachePattern("cache:/api/v1/insured/get_count*"),
      deleteCachePattern("cache:/api/v1/insured/getTotalCar*"),
      deleteCachePattern("cache:/api/v1/insured/getActiveInsurancesCount*"),
      deleteCachePattern("cache:/api/v1/insured/getExpiredInsurancesCount*"),
      deleteCachePattern("cache:/api/v1/insured/getTotalPayments*"),
      deleteCachePattern("cache:/api/v1/insured/getPaymentsByMethod*"),
      deleteCachePattern("cache:/api/v1/insured/getReturnedChecksAmount*"),
      deleteCachePattern("cache:/api/v1/insured/getInsuredByMonth*"),
    ]);
    logger.info("Invalidated statistics cache");
  } catch (error) {
    logger.error("Error invalidating stats cache:", error);
  }
};

/**
 * Invalidate report caches
 * Call this after data changes that affect reports
 */
export const invalidateReportsCache = async () => {
  try {
    await deleteCachePattern("cache:report:*");
    logger.info("Invalidated reports cache");
  } catch (error) {
    logger.error("Error invalidating reports cache:", error);
  }
};

/**
 * Invalidate all caches for a specific insured customer
 */
export const invalidateInsuredByIdCache = async (insuredId) => {
  try {
    await deleteCachePattern(`cache:/api/v1/insured/findInsured/${insuredId}*`);
    await invalidateInsuredCache();
    logger.info(`Invalidated cache for insured ID: ${insuredId}`);
  } catch (error) {
    logger.error("Error invalidating insured by ID cache:", error);
  }
};

/**
 * Invalidate company-related caches
 */
export const invalidateCompanyCache = async () => {
  try {
    await deleteCachePattern("cache:/api/v1/company*");
    logger.info("Invalidated company cache");
  } catch (error) {
    logger.error("Error invalidating company cache:", error);
  }
};

/**
 * Combined invalidation for operations that affect multiple entities
 * For example: adding insurance affects insured lists, stats, and reports
 */
export const invalidateAllRelatedCaches = async () => {
  try {
    await Promise.all([
      invalidateInsuredCache(),
      invalidateStatsCache(),
      invalidateReportsCache(),
    ]);
    logger.info("Invalidated all related caches");
  } catch (error) {
    logger.error("Error invalidating all caches:", error);
  }
};

export default {
  invalidateInsuredCache,
  invalidateStatsCache,
  invalidateReportsCache,
  invalidateInsuredByIdCache,
  invalidateCompanyCache,
  invalidateAllRelatedCaches,
};
