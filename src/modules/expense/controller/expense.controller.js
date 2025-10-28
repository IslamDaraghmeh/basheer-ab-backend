import { ExpenseModel } from "../../../../DB/models/Expense.model.js";
import { insuredModel } from "../../../../DB/models/Insured.model.js";
import { getPaginationParams, buildPaginatedResponse } from "../../../utils/pagination.js";
import logger from "../../../utils/logService.js";


export const addExpense = async (req, res, next) => {
  try {
    const { title, amount, paidBy, paymentMethod, status, description, date } = req.body;
    if (!title || !amount || !paidBy) {
      return res.status(400).json({ message: "Title, amount, and paidBy are required" });
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

    res.status(201).json({ message: "Expense recorded successfully", expense: savedExpense });
  } catch (error) {
    next(error);
  }
};



export const getNetProfit = async (req, res, next) => {
  try {
   
    const insureds = await insuredModel.find().select("vehicles.insurance");
    let totalRevenue = 0;
    insureds.forEach(insured => {
      insured.vehicles.forEach(vehicle => {
        vehicle.insurance.forEach(insurance => {
          totalRevenue += insurance.paidAmount || 0;
        });
      });
    });

 
    const expenses = await ExpenseModel.find();
    let totalExpenses = 0;
    expenses.forEach(expense => {
      totalExpenses += expense.amount || 0;
    });

   
    const netProfit = totalRevenue - totalExpenses;

    res.status(200).json({
      totalRevenue,   
      totalExpenses,    
      netProfit     
    });
  } catch (error) {
    next(error);
  }
};


export const getExpenses = async (req, res, next) => {
  try {
    const expenses = await ExpenseModel.find().sort({ date: -1 });
    res.status(200).json({ expenses });
  } catch (error) {
    next(error);
  }
};

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
export const getExpensesWithFilters = async (req, res, next) => {
  try {
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

    return res.status(200).json({
      message: "Expenses retrieved successfully",
      timestamp: new Date().toISOString(),
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
    });
  } catch (error) {
    logger.error("Error fetching expenses with filters:", error);
    next(error);
  }
};


export const updateExpense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, amount, paidBy, paymentMethod, status, description, date } = req.body;

    const updatedExpense = await ExpenseModel.findByIdAndUpdate(
      id,
      { title, amount, paidBy, paymentMethod, status, description, ...(date && { date }) },
      { new: true, runValidators: true }
    );

    if (!updatedExpense) return res.status(404).json({ message: "Expense not found" });

    res.status(200).json({ message: "Expense updated successfully", expense: updatedExpense });
  } catch (error) {
    next(error);
  }
};


export const deleteExpense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await ExpenseModel.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Expense not found" });

    res.status(200).json({ message: "Expense deleted successfully" });
  } catch (error) {
    next(error);
  }
};











export const cancelInsurance = async (req, res, next) => {
  try {
    const { insuredId, vehicleId, insuranceId } = req.params;
    const { refundAmount, paidBy, paymentMethod, description } = req.body;

    const insured = await insuredModel.findById(insuredId);
    if (!insured) return res.status(404).json({ message: "The customer is not present" });

    const vehicle = insured.vehicles.id(vehicleId);
    if (!vehicle) return res.status(404).json({ message: "The vehicle is not available. " });

    const insurance = vehicle.insurance.id(insuranceId);
    if (!insurance) return res.status(404).json({ message: "The insurance is not available." });

insurance.insuranceStatus = "cancelled";
insurance.refundAmount = refundAmount;

// تخطي التحقق من الحقول required
await insured.save({ validateBeforeSave: false });

// إنشاء المصروف كالمعتاد
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

    return res.status(200).json({
      message: "Insurance cancelled and expense recorded",
      insurance,
      expense,
    });
  } catch (error) {
    next(error);
  }
};










export const getCompanyFinancialReport = async (req, res, next) => {
  try {
    const { startDate, endDate, agentName } = req.query;

 
    const insureds = await insuredModel.find().select("joining_date agentsName vehicles.insurance");
    let totalRevenue = 0;

    insureds.forEach(insured => {
    
      if (startDate && endDate) {
        const joining = new Date(insured.joining_date);
        if (joining < new Date(startDate) || joining > new Date(endDate)) return;
      }

     
      if (agentName && insured.agentsName !== agentName) return;

      insured.vehicles.forEach(vehicle => {
        vehicle.insurance.forEach(insurance => {
          totalRevenue += insurance.paidAmount || 0;
        });
      });
    });

  
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

    res.status(200).json({
      totalRevenue,
      totalExpenses,
      netProfit,
      details: {
        revenueRecords: totalRevenue,
        expensesRecords: expenses
      }
    });
  } catch (error) {
    next(error);
  }
};
