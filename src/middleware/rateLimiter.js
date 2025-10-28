import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for authentication endpoints
 * Prevents brute force attacks on login/signup
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 50 : 5, // More lenient in development
  message: {
    success: false,
    message: 'Too many authentication attempts from this IP, please try again after 15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: false, // Count successful requests
  skipFailedRequests: false // Also count failed requests
});

/**
 * Rate limiter for general API endpoints
 * Prevents API abuse
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Strict rate limiter for sensitive operations
 * e.g., password reset, email verification
 */
export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 requests per hour
  message: {
    success: false,
    message: 'Too many requests for this operation, please try again after 1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Rate limiter for file uploads
 * Prevents excessive file upload abuse
 */
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 uploads per window
  message: {
    success: false,
    message: 'Too many file uploads, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Rate limiter for external API calls
 * Prevents excessive calls to government APIs
 */
export const externalApiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 requests per minute
  message: {
    success: false,
    message: 'Too many API requests, please try again after 1 minute'
  },
  standardHeaders: true,
  legacyHeaders: false
});
