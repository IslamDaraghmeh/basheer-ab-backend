/**
 * Standardized API Response Utilities
 * Provides consistent response format across all endpoints
 */

/**
 * Success response
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code (default: 200)
 * @returns {Object} Express response
 */
export const successResponse = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

/**
 * Error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {*} errors - Additional error details
 * @returns {Object} Express response
 */
export const errorResponse = (res, message = 'An error occurred', statusCode = 500, errors = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
    timestamp: new Date().toISOString()
  });
};

/**
 * Paginated success response
 * @param {Object} res - Express response object
 * @param {Array} data - Array of data items
 * @param {Object} pagination - Pagination metadata
 * @param {string} message - Success message
 * @returns {Object} Express response
 */
export const paginatedResponse = (res, data, pagination, message = 'Success') => {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      currentPage: pagination.currentPage,
      totalPages: pagination.totalPages,
      totalItems: pagination.totalItems,
      itemsPerPage: pagination.itemsPerPage,
      hasNextPage: pagination.hasNextPage,
      hasPrevPage: pagination.hasPrevPage
    },
    timestamp: new Date().toISOString()
  });
};

/**
 * Not found response
 * @param {Object} res - Express response object
 * @param {string} resource - Resource name that was not found
 * @returns {Object} Express response
 */
export const notFoundResponse = (res, resource = 'Resource') => {
  return errorResponse(res, `${resource} not found`, 404);
};

/**
 * Unauthorized response
 * @param {Object} res - Express response object
 * @param {string} message - Custom message
 * @returns {Object} Express response
 */
export const unauthorizedResponse = (res, message = 'Unauthorized access') => {
  return errorResponse(res, message, 401);
};

/**
 * Forbidden response
 * @param {Object} res - Express response object
 * @param {string} message - Custom message
 * @returns {Object} Express response
 */
export const forbiddenResponse = (res, message = 'Access forbidden') => {
  return errorResponse(res, message, 403);
};

/**
 * Bad request response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {*} errors - Validation errors
 * @returns {Object} Express response
 */
export const badRequestResponse = (res, message = 'Bad request', errors = null) => {
  return errorResponse(res, message, 400, errors);
};

/**
 * Conflict response
 * @param {Object} res - Express response object
 * @param {string} message - Conflict message
 * @returns {Object} Express response
 */
export const conflictResponse = (res, message = 'Resource already exists') => {
  return errorResponse(res, message, 409);
};

/**
 * Created response
 * @param {Object} res - Express response object
 * @param {*} data - Created resource data
 * @param {string} message - Success message
 * @returns {Object} Express response
 */
export const createdResponse = (res, data, message = 'Resource created successfully') => {
  return successResponse(res, data, message, 201);
};

/**
 * No content response (for successful DELETE operations)
 * @param {Object} res - Express response object
 * @returns {Object} Express response
 */
export const noContentResponse = (res) => {
  return res.status(204).send();
};

/**
 * Class-based API Response (for those who prefer OOP style)
 */
export class ApiResponse {
  static success(res, data = null, message = 'Success', statusCode = 200) {
    return successResponse(res, data, message, statusCode);
  }

  static error(res, message = 'An error occurred', statusCode = 500, errors = null) {
    return errorResponse(res, message, statusCode, errors);
  }

  static paginated(res, data, pagination, message = 'Success') {
    return paginatedResponse(res, data, pagination, message);
  }

  static notFound(res, resource = 'Resource') {
    return notFoundResponse(res, resource);
  }

  static unauthorized(res, message = 'Unauthorized access') {
    return unauthorizedResponse(res, message);
  }

  static forbidden(res, message = 'Access forbidden') {
    return forbiddenResponse(res, message);
  }

  static badRequest(res, message = 'Bad request', errors = null) {
    return badRequestResponse(res, message, errors);
  }

  static conflict(res, message = 'Resource already exists') {
    return conflictResponse(res, message);
  }

  static created(res, data, message = 'Resource created successfully') {
    return createdResponse(res, data, message);
  }

  static noContent(res) {
    return noContentResponse(res);
  }
}

export default ApiResponse;
