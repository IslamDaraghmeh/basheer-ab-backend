/**
 * Request validation middleware using Joi schemas
 * Validates request body, query, or params against a Joi schema
 */

/**
 * Validates request data against a Joi schema
 * @param {Object} schema - Joi validation schema
 * @param {String} source - Where to validate: 'body', 'query', 'params'
 * @returns {Function} Express middleware function
 */
export const validateRequest = (schema, source = 'body') => {
  return (req, res, next) => {
    const dataToValidate = req[source];

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false, // Return all errors, not just the first one
      stripUnknown: true // Remove unknown fields
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    // Replace request data with validated and sanitized data
    req[source] = value;
    next();
  };
};

/**
 * Validates multiple sources (body, query, params) at once
 * @param {Object} schemas - Object with keys: body, query, params and Joi schemas as values
 * @returns {Function} Express middleware function
 */
export const validateMultiple = (schemas) => {
  return (req, res, next) => {
    const errors = [];

    // Validate each source
    for (const [source, schema] of Object.entries(schemas)) {
      if (schema && req[source]) {
        const { error, value } = schema.validate(req[source], {
          abortEarly: false,
          stripUnknown: true
        });

        if (error) {
          errors.push(...error.details.map(detail => ({
            source,
            field: detail.path.join('.'),
            message: detail.message
          })));
        } else {
          req[source] = value;
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    next();
  };
};
