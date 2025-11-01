/**
 * Async Handler Utility
 * Wraps async route handlers to catch errors automatically
 * Eliminates need for try-catch blocks in every controller function
 */

/**
 * Wraps async route handlers to catch errors automatically
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Express middleware function
 *
 * @example
 * export const create = asyncHandler(async (req, res) => {
 *   const result = await Model.create(req.body);
 *   return res.status(201).json({ result });
 * });
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
