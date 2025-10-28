import Joi from 'joi';

// Validation schema for adding expense
export const addExpenseSchema = Joi.object({
  title: Joi.string().required().trim().min(2).max(200).messages({
    'string.empty': 'Title is required',
    'string.min': 'Title must be at least 2 characters',
    'string.max': 'Title must not exceed 200 characters'
  }),
  amount: Joi.number().required().min(0).messages({
    'number.base': 'Amount must be a number',
    'number.min': 'Amount must be a positive number',
    'any.required': 'Amount is required'
  }),
  paidBy: Joi.string().required().trim().messages({
    'string.empty': 'Paid by is required'
  }),
  paymentMethod: Joi.string().valid('cash', 'card', 'cheque', 'bank_transfer').default('cash').messages({
    'any.only': 'Payment method must be one of: cash, card, cheque, bank_transfer'
  }),
  status: Joi.string().valid('pending', 'paid', 'cancelled').default('paid').messages({
    'any.only': 'Status must be one of: pending, paid, cancelled'
  }),
  description: Joi.string().optional().allow('').max(1000),
  date: Joi.date().optional()
});

// Validation schema for updating expense
export const updateExpenseSchema = Joi.object({
  title: Joi.string().trim().min(2).max(200).optional(),
  amount: Joi.number().min(0).optional(),
  paidBy: Joi.string().trim().optional(),
  paymentMethod: Joi.string().valid('cash', 'card', 'cheque', 'bank_transfer').optional(),
  status: Joi.string().valid('pending', 'paid', 'cancelled').optional(),
  description: Joi.string().allow('').max(1000).optional(),
  date: Joi.date().optional()
});

// Validation schema for expense filters
export const expenseFiltersSchema = Joi.object({
  startDate: Joi.date().optional(),
  endDate: Joi.date().min(Joi.ref('startDate')).optional().messages({
    'date.min': 'End date must be after start date'
  }),
  status: Joi.string().optional().valid('all', 'pending', 'paid', 'cancelled').messages({
    'any.only': 'Status must be one of: all, pending, paid, cancelled'
  }),
  paymentMethod: Joi.string().optional().valid('cash', 'card', 'cheque', 'bank_transfer').messages({
    'any.only': 'Payment method must be one of: cash, card, cheque, bank_transfer'
  }),
  paidBy: Joi.string().optional().trim(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  sortBy: Joi.string().optional()
});

// Validation schema for cancel insurance
export const cancelInsuranceSchema = Joi.object({
  refundAmount: Joi.number().required().min(0).messages({
    'number.min': 'Refund amount must be a positive number',
    'any.required': 'Refund amount is required'
  }),
  paidBy: Joi.string().required().trim().messages({
    'string.empty': 'Paid by is required'
  }),
  paymentMethod: Joi.string().valid('cash', 'card', 'cheque', 'bank_transfer').required(),
  description: Joi.string().optional().allow('').max(1000)
});
