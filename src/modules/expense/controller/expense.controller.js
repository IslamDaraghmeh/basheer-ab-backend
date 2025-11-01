import { ExpenseModel } from "#db/models/Expense.model.js";
import { insuredModel } from "#db/models/Insured.model.js";
import { getPaginationParams, buildPaginatedResponse } from "#utils/pagination.js";
import logger from "#utils/logService.js";
import { asyncHandler } from "#utils/asyncHandler.js";
import { logAudit } from "#utils/auditLogger.js";
import {
  createdResponse,
  successResponse,
  notFoundResponse,
  badRequestResponse
} from "#utils/apiResponse.js";

export const create = asyncHandler(async (req, res) => {
  const { title, amount, paidBy, paymentMethod, status, description, date } = req.body;

  if (!title || !amount || !paidBy) {
    return badRequestResponse(res, "Title, amount, and paidBy are required");
  }

  const receiptNumber = `EXP-${Date.now()}`;
  const expense = new ExpenseModel({
    title,
    amount,
    paidBy,
    paymentMethod,
    status,
    description,
    receiptNumber,
    ...(date && { date })
  });
  const savedExpense = await expense.save();

  return createdResponse(res, { expense: savedExpense }, "Expense recorded successfully");
});

export const getNetProfit = asyncHandler(async (req, res) => {
  // Calculate total revenue from insurances
  const insureds = await insuredModel.find().select("vehicles.insurance");
  let totalRevenue = 0;
  insureds.forEach(insured => {
    insured.vehicles.forEach(vehicle => {
      vehicle.insurance.forEach(insurance => {
        totalRevenue += insurance.paidAmount || 0;
      });
    });
  });

  // Calculate total expenses
  const expenses = await ExpenseModel.find();
  let totalExpenses = 0;
  expenses.forEach(expense => {
    totalExpenses += expense.amount || 0;
  });

  // Calculate net profit
  const netProfit = totalRevenue - totalExpenses;

  return successResponse(res, {
    totalRevenue,
    totalExpenses,
    netProfit
  }, "Net profit calculated successfully");
});

export const list = asyncHandler(async (req, res) => {
  const expenses = await ExpenseModel.find().sort({ date: -1 });
  return successResponse(res, { expenses, count: expenses.length }, "Expenses retrieved successfully");
});

/**
 * Get All Expenses with Filters
 * @query {string} startDate - Filter by expense date from (optional)
 * @query {string} endDate - Filter by expense date to (optional)
 * @query {string} status - Filter by status: 'pending', 'paid', 'cancelled', or 'all' (default: 'all')
 * @query {string} paymentMethod - Filter by payment method: 'cash', 'card', 'cheque', 'bank_transfer' (optional)
 * @query {string} paidBy - Filter by who paid the expense (optional)
 * @query {number} page - Page number for pagination (optional)
 * @query {number} limit - Number of items per page (optional)
 */
export const getExpensesWithFilters = asyncHandler(async (req, res) => {
  const {
    startDate,
    endDate,
    status = 'all',
    paymentMethod,
    paidBy
  } = req.query;
  const { page, limit, skip } = getPaginationParams(req.query);

  // Build filter conditions
  const filter = {};

  // Date range filter
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) {
      filter.date.$gte = new Date(startDate);
    }
    if (endDate) {
      filter.date.$lte = new Date(endDate);
    }
  }

  // Status filter
  if (status && status !== 'all') {
    filter.status = status;
  }

  // Payment method filter
  if (paymentMethod) {
    filter.paymentMethod = paymentMethod;
  }

  // Paid by filter
  if (paidBy) {
    filter.paidBy = paidBy;
  }

  // Execute query with pagination
  const [expenses, total] = await Promise.all([
    ExpenseModel.find(filter)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ExpenseModel.countDocuments(filter)
  ]);

  const response = buildPaginatedResponse(expenses, total, page, limit);

  // Calculate summary statistics
  const allExpenses = await ExpenseModel.find(filter).lean();
  const summary = {
    totalExpenses: total,
    totalAmount: allExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0),
    pendingExpenses: allExpenses.filter(exp => exp.status === 'pending').length,
    paidExpenses: allExpenses.filter(exp => exp.status === 'paid').length,
    cancelledExpenses: allExpenses.filter(exp => exp.status === 'cancelled').length,
    byPaymentMethod: {
      cash: allExpenses.filter(exp => exp.paymentMethod === 'cash').reduce((sum, exp) => sum + exp.amount, 0),
      card: allExpenses.filter(exp => exp.paymentMethod === 'card').reduce((sum, exp) => sum + exp.amount, 0),
      cheque: allExpenses.filter(exp => exp.paymentMethod === 'cheque').reduce((sum, exp) => sum + exp.amount, 0),
      bank_transfer: allExpenses.filter(exp => exp.paymentMethod === 'bank_transfer').reduce((sum, exp) => sum + exp.amount, 0),
    }
  };

  return successResponse(res, {
    filters: {
      startDate: startDate || null,
      endDate: endDate || null,
      status: status || 'all',
      paymentMethod: paymentMethod || null,
      paidBy: paidBy || null
    },
    summary,
    ...response,
    expenses: response.data
  }, "Expenses retrieved successfully");
});

export const updateExpense = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, amount, paidBy, paymentMethod, status, description, date } = req.body;

  const updatedExpense = await ExpenseModel.findByIdAndUpdate(
    id,
    { title, amount, paidBy, paymentMethod, status, description, ...(date && { date }) },
    { new: true, runValidators: true }
  );

  if (!updatedExpense) {
    return notFoundResponse(res, "Expense");
  }

  return successResponse(res, { expense: updatedExpense }, "Expense updated successfully");
});

export const deleteExpense = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const deleted = await ExpenseModel.findByIdAndDelete(id);

  if (!deleted) {
    return notFoundResponse(res, "Expense");
  }

  return successResponse(res, null, "Expense deleted successfully");
});

export const cancelInsurance = asyncHandler(async (req, res) => {
  const { insuredId, vehicleId, insuranceId } = req.params;
  const { refundAmount, paidBy, paymentMethod, description } = req.body;

  const insured = await insuredModel.findById(insuredId);
  if (!insured) {
    return notFoundResponse(res, "Customer");
  }

  const vehicle = insured.vehicles.id(vehicleId);
  if (!vehicle) {
    return notFoundResponse(res, "Vehicle");
  }

  const insurance = vehicle.insurance.id(insuranceId);
  if (!insurance) {
    return notFoundResponse(res, "Insurance");
  }

  insurance.insuranceStatus = "cancelled";
  insurance.refundAmount = refundAmount;

  // Skip required field validation
  await insured.save({ validateBeforeSave: false });

  // Create expense record
  const receiptNumber = `EXP-${Date.now()}`;
  const expense = new ExpenseModel({
    title: `Refund for cancelled insurance (${insurance.insuranceCompany})`,
    amount: refundAmount,
    paidBy,
    paymentMethod,
    description,
    receiptNumber,
  });
  await expense.save();

  return successResponse(res, {
    insurance,
    expense
  }, "Insurance cancelled and expense recorded");
});

export const getCompanyFinancialReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, agentName } = req.query;

  // Calculate total revenue
  const insureds = await insuredModel.find().select("joining_date agentsName vehicles.insurance");
  let totalRevenue = 0;

  insureds.forEach(insured => {
    // Filter by date range
    if (startDate && endDate) {
      const joining = new Date(insured.joining_date);
      if (joining < new Date(startDate) || joining > new Date(endDate)) return;
    }

    // Filter by agent name
    if (agentName && insured.agentsName !== agentName) return;

    insured.vehicles.forEach(vehicle => {
      vehicle.insurance.forEach(insurance => {
        totalRevenue += insurance.paidAmount || 0;
      });
    });
  });

  // Calculate total expenses with filters
  const expenseFilter = {};
  if (startDate && endDate) {
    expenseFilter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }
  if (agentName) {
    expenseFilter.paidBy = agentName;
  }

  const expenses = await ExpenseModel.find(expenseFilter);
  let totalExpenses = 0;
  expenses.forEach(expense => {
    totalExpenses += expense.amount || 0;
  });

  const netProfit = totalRevenue - totalExpenses;

  return successResponse(res, {
    totalRevenue,
    totalExpenses,
    netProfit,
    details: {
      revenueRecords: totalRevenue,
      expensesRecords: expenses
    }
  }, "Company financial report retrieved successfully");
});
