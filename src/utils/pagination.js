/**
 * Pagination utility helper
 * Provides consistent pagination logic across all endpoints
 */

/**
 * Get pagination parameters from query string
 * @param {Object} query - Express request query object
 * @returns {Object} - { page, limit, skip }
 */
export const getPaginationParams = (query) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const skip = (page - 1) * limit;

  // Validate and cap the limits
  const validLimit = Math.min(Math.max(limit, 1), 100); // Max 100 items per page
  const validPage = Math.max(page, 1);
  const validSkip = (validPage - 1) * validLimit;

  return {
    page: validPage,
    limit: validLimit,
    skip: validSkip
  };
};

/**
 * Build paginated response object
 * @param {Array} data - The data array
 * @param {Number} total - Total count of items
 * @param {Number} page - Current page number
 * @param {Number} limit - Items per page
 * @returns {Object} - Formatted pagination response
 */
export const buildPaginatedResponse = (data, total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage,
      hasPrevPage,
      nextPage: hasNextPage ? page + 1 : null,
      prevPage: hasPrevPage ? page - 1 : null
    }
  };
};

/**
 * Get sort parameters from query string
 * @param {Object} query - Express request query object
 * @param {String} defaultSort - Default sort field (e.g., '-createdAt')
 * @param {Array} allowedFields - Whitelist of allowed sort fields
 * @returns {Object} - Mongoose sort object
 */
export const getSortParams = (query, defaultSort = '-createdAt', allowedFields = []) => {
  const sortBy = query.sortBy || defaultSort;
  const sortOrder = sortBy.startsWith('-') ? -1 : 1;
  let sortField = sortBy.startsWith('-') ? sortBy.substring(1) : sortBy;

  // Prevent prototype pollution attacks
  if (sortField.includes('__proto__') ||
      sortField.includes('constructor') ||
      sortField.includes('prototype')) {
    sortField = defaultSort.startsWith('-') ? defaultSort.substring(1) : defaultSort;
  }

  // Prevent NoSQL injection through special characters
  if (/[{}\[\]$]/.test(sortField)) {
    sortField = defaultSort.startsWith('-') ? defaultSort.substring(1) : defaultSort;
  }

  // Whitelist validation if allowedFields are provided
  if (allowedFields.length > 0 && !allowedFields.includes(sortField)) {
    // Fall back to default sort field
    sortField = defaultSort.startsWith('-') ? defaultSort.substring(1) : defaultSort;
    const defaultOrder = defaultSort.startsWith('-') ? -1 : 1;
    return { [sortField]: defaultOrder };
  }

  return { [sortField]: sortOrder };
};

/**
 * Common allowed sort fields for different endpoints
 */
export const SORT_FIELDS = {
  INSURED: ['first_name', 'last_name', 'joining_date', 'createdAt', 'updatedAt', 'city', 'email'],
  INSURANCE: ['insuranceStartDate', 'insuranceEndDate', 'insuranceCompany', 'insuranceType', 'paidAmount', 'remainingDebt'],
  VEHICLE: ['plateNumber', 'model', 'type', 'licenseExpiry'],
};
