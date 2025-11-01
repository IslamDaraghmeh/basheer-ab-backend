import logger from "./logService.js";

const requiredEnvVars = {
  production: [
    'DB_URI',
    'TokenSignIn',
    'saltRound',
    'EMAIL_HOST',
    'EMAIL_USER',
    'EMAIL_PASSWORD',
    'FRONTEND_URL',
    'BACKEND_URL',
    'CORS_ORIGINS'
  ],
  development: [
    'DB_URI',
    'TokenSignIn',
    'saltRound'
  ]
};

/**
 * Validate required environment variables on application startup
 * @throws {Error} If required environment variables are missing
 */
export const validateEnvironment = () => {
  const env = process.env.NODE_ENV || 'development';
  const required = requiredEnvVars[env] || requiredEnvVars.development;

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    logger.error('Missing required environment variables:', missing);
    console.error('\n⚠️  ERROR: Missing required environment variables:');
    console.error('   -', missing.join('\n   - '));
    console.error('\nPlease check your .env file and ensure all required variables are set.');
    console.error('See .env.example for reference.\n');
    process.exit(1);
  }

  // Validate JWT secret strength
  if (process.env.TokenSignIn && process.env.TokenSignIn.length < 32) {
    logger.warn('JWT secret (TokenSignIn) is too short. Recommended: at least 32 characters');
  }

  // Validate saltRound is a number
  const saltRound = parseInt(process.env.saltRound);
  if (isNaN(saltRound) || saltRound < 10) {
    logger.error('saltRound must be a number >= 10');
    process.exit(1);
  }

  logger.info(`Environment variables validated successfully for ${env} environment`);
};

/**
 * Get environment variable with default value
 * @param {string} key - Environment variable key
 * @param {*} defaultValue - Default value if not set
 * @returns {*} Environment variable value or default
 */
export const getEnv = (key, defaultValue = undefined) => {
  return process.env[key] || defaultValue;
};

/**
 * Check if running in production
 * @returns {boolean}
 */
export const isProduction = () => {
  return process.env.NODE_ENV === 'production';
};

/**
 * Check if running in development
 * @returns {boolean}
 */
export const isDevelopment = () => {
  return process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
};
