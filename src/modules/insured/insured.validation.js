import Joi from 'joi';

// Validation schema for adding a new insured customer
export const addInsuredSchema = Joi.object({
  first_name: Joi.string().required().trim().min(2).max(50).messages({
    'string.empty': 'First name is required',
    'string.min': 'First name must be at least 2 characters',
    'string.max': 'First name must not exceed 50 characters'
  }),

  last_name: Joi.string().required().trim().min(2).max(50).messages({
    'string.empty': 'Last name is required',
    'string.min': 'Last name must be at least 2 characters',
    'string.max': 'Last name must not exceed 50 characters'
  }),

  id_Number: Joi.string().required().pattern(/^[0-9]{9}$/).messages({
    'string.empty': 'ID number is required',
    'string.pattern.base': 'ID number must be exactly 9 digits'
  }),

  phone_number: Joi.string().required().pattern(/^[0-9]{10,15}$/).messages({
    'string.empty': 'Phone number is required',
    'string.pattern.base': 'Phone number must be 10-15 digits'
  }),

  email: Joi.string().email().required().messages({
    'string.empty': 'Email is required',
    'string.email': 'Email must be a valid email address'
  }),

  city: Joi.string().required().trim().min(2).max(50).messages({
    'string.empty': 'City is required'
  }),

  birth_date: Joi.date().max('now').required().messages({
    'date.base': 'Birth date must be a valid date',
    'date.max': 'Birth date cannot be in the future'
  }),

  joining_date: Joi.date().optional(),
  notes: Joi.string().optional().allow('').max(500),
  agentsName: Joi.string().optional().allow(''),

  vehicles: Joi.array().items(Joi.object({
    plateNumber: Joi.string().required().trim().min(1).max(20),
    model: Joi.string().required().trim(),
    type: Joi.string().required().trim(),
    ownership: Joi.string().required().trim(),
    modelNumber: Joi.string().required().trim(),
    licenseExpiry: Joi.date().required(),
    lastTest: Joi.date().required(),
    color: Joi.string().required().trim(),
    price: Joi.number().required().min(0),
    image: Joi.string().uri().optional(),
    insurance: Joi.array().optional()
  })).optional()
});

// Validation schema for updating insured
export const updateInsuredSchema = Joi.object({
  first_name: Joi.string().trim().min(2).max(50).optional(),
  last_name: Joi.string().trim().min(2).max(50).optional(),
  id_Number: Joi.string().pattern(/^[0-9]{9}$/).optional(),
  phone_number: Joi.string().pattern(/^[0-9]{10,15}$/).optional(),
  email: Joi.string().email().optional(),
  city: Joi.string().trim().min(2).max(50).optional(),
  birth_date: Joi.date().max('now').optional(),
  joining_date: Joi.date().optional(),
  notes: Joi.string().allow('').max(500).optional()
});

// Validation schema for adding a vehicle
export const addVehicleSchema = Joi.object({
  plateNumber: Joi.string().required().trim().min(1).max(20).messages({
    'string.empty': 'Plate number is required'
  }),
  model: Joi.string().required().trim(),
  type: Joi.string().required().trim(),
  ownership: Joi.string().required().trim(),
  modelNumber: Joi.string().required().trim(),
  licenseExpiry: Joi.date().required(),
  lastTest: Joi.date().required(),
  color: Joi.string().required().trim(),
  price: Joi.number().required().min(0).messages({
    'number.min': 'Price must be a positive number'
  })
});

// Validation schema for updating a vehicle
export const updateVehicleSchema = Joi.object({
  plateNumber: Joi.string().trim().min(1).max(20).optional(),
  model: Joi.string().trim().optional(),
  type: Joi.string().trim().optional(),
  ownership: Joi.string().trim().optional(),
  modelNumber: Joi.string().trim().optional(),
  licenseExpiry: Joi.date().optional(),
  lastTest: Joi.date().optional(),
  color: Joi.string().trim().optional(),
  price: Joi.number().min(0).optional()
});

// Payment object validation schema
const paymentObjectSchema = Joi.object({
  amount: Joi.number().required().min(0.01).messages({
    'number.min': 'Payment amount must be greater than 0'
  }),
  paymentMethod: Joi.string().required().valid('cash', 'card', 'cheque', 'bank_transfer').messages({
    'any.only': 'Payment method must be cash, card, cheque, or bank_transfer'
  }),
  paymentDate: Joi.date().optional(),
  notes: Joi.string().optional().allow('').max(500),
  receiptNumber: Joi.string().optional().allow(''),
  chequeNumber: Joi.string().when('paymentMethod', {
    is: 'cheque',
    then: Joi.string().required(),
    otherwise: Joi.string().optional()
  }),
  chequeDate: Joi.date().when('paymentMethod', {
    is: 'cheque',
    then: Joi.date().required(),
    otherwise: Joi.date().optional()
  }),
  chequeStatus: Joi.string().optional().valid('pending', 'cleared', 'returned', 'cancelled')
});

// Validation schema for adding insurance (NEW VERSION)
export const addInsuranceSchema = Joi.object({
  insuranceType: Joi.string().required().trim().messages({
    'string.empty': 'Insurance type is required'
  }),
  insuranceCompany: Joi.string().required().trim().messages({
    'string.empty': 'Insurance company is required'
  }),
  agent: Joi.string().optional().allow(''),
  agentId: Joi.string().optional().allow(''),
  isUnder24: Joi.boolean().required(),

  // Total insurance value
  insuranceAmount: Joi.number().required().min(0).messages({
    'number.min': 'Insurance amount must be a positive number',
    'any.required': 'Insurance amount is required'
  }),

  // Agent flow
  agentFlow: Joi.string().optional().valid('to_agent', 'from_agent', 'none').messages({
    'any.only': 'Agent flow must be to_agent, from_agent, or none'
  }),

  // Agent amount (for credit/debit)
  agentAmount: Joi.number().optional().min(0).messages({
    'number.min': 'Agent amount must be a positive number'
  }),

  // Multi-method payments array
  payments: Joi.array().items(paymentObjectSchema).optional().messages({
    'array.base': 'Payments must be an array'
  }),

  // Optional date overrides
  insuranceStartDate: Joi.date().optional(),
  insuranceEndDate: Joi.date().optional().min(Joi.ref('insuranceStartDate')).messages({
    'date.min': 'End date must be after start date'
  })
});

// Validation schema for adding single payment to existing insurance
export const addPaymentSchema = Joi.object({
  amount: Joi.number().required().min(0.01).messages({
    'number.min': 'Payment amount must be greater than 0',
    'any.required': 'Payment amount is required'
  }),
  paymentMethod: Joi.string().required().valid('cash', 'card', 'cheque', 'bank_transfer').messages({
    'any.only': 'Payment method must be cash, card, cheque, or bank_transfer',
    'any.required': 'Payment method is required'
  }),
  paymentDate: Joi.date().optional(),
  notes: Joi.string().optional().allow('').max(500),
  receiptNumber: Joi.string().optional().allow(''),
  chequeNumber: Joi.string().when('paymentMethod', {
    is: 'cheque',
    then: Joi.string().required().messages({
      'any.required': 'Cheque number is required when payment method is cheque'
    }),
    otherwise: Joi.string().optional()
  }),
  chequeDate: Joi.date().when('paymentMethod', {
    is: 'cheque',
    then: Joi.date().required().messages({
      'any.required': 'Cheque date is required when payment method is cheque'
    }),
    otherwise: Joi.date().optional()
  }),
  chequeStatus: Joi.string().optional().valid('pending', 'cleared', 'returned', 'cancelled')
});

// Validation schema for adding a check
export const addCheckSchema = Joi.object({
  checkNumber: Joi.string().required().trim().messages({
    'string.empty': 'Check number is required'
  }),
  checkDueDate: Joi.date().required().messages({
    'date.base': 'Check due date must be a valid date'
  }),
  checkAmount: Joi.number().required().min(0).messages({
    'number.min': 'Check amount must be a positive number'
  }),
  isReturned: Joi.boolean().optional().default(false)
});

// Validation schema for query parameters
export const paginationQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  sortBy: Joi.string().optional()
});

// Validation schema for customer report query
export const customerReportQuerySchema = Joi.object({
  startDate: Joi.date().optional(),
  endDate: Joi.date().min(Joi.ref('startDate')).optional(),
  agentName: Joi.string().optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  sortBy: Joi.string().optional()
});

// Validation schema for filtered insured list query
export const filteredInsuredListQuerySchema = Joi.object({
  startDate: Joi.date().optional().messages({
    'date.base': 'Start date must be a valid date'
  }),
  endDate: Joi.date().min(Joi.ref('startDate')).optional().messages({
    'date.base': 'End date must be a valid date',
    'date.min': 'End date must be after start date'
  }),
  agentName: Joi.string().optional().trim(),
  agentId: Joi.string().optional().trim().pattern(/^[0-9a-fA-F]{24}$/).messages({
    'string.pattern.base': 'Agent ID must be a valid MongoDB ObjectId'
  }),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  sortBy: Joi.string().optional()
});

// Validation schema for vehicle insurance report
export const vehicleInsuranceReportQuerySchema = Joi.object({
  startDate: Joi.date().optional(),
  endDate: Joi.date().min(Joi.ref('startDate')).optional(),
  agent: Joi.string().optional(),
  company: Joi.string().optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional()
});

// Validation schema for customer search
export const searchCustomerQuerySchema = Joi.object({
  searchKey: Joi.string().required().trim().min(1).max(50).messages({
    'string.empty': 'Search key is required',
    'string.min': 'Search key must be at least 1 character',
    'string.max': 'Search key must not exceed 50 characters',
    'any.required': 'Search key is required'
  })
});

// Validation schema for getAllVehicleInsurances with filters
export const vehicleInsurancesFilterSchema = Joi.object({
  startDate: Joi.date().optional(),
  endDate: Joi.date().min(Joi.ref('startDate')).optional().messages({
    'date.min': 'End date must be after start date'
  }),
  agent: Joi.string().optional().trim(),
  insuranceCompany: Joi.string().optional().trim(),
  insuranceType: Joi.string().optional().trim(),
  status: Joi.string().optional().valid('all', 'active', 'expired').messages({
    'any.only': 'Status must be one of: all, active, expired'
  }),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  sortBy: Joi.string().optional()
});
