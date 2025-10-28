import { insuredModel } from "../../../../DB/models/Insured.model.js";
import { ExpenseModel } from "../../../../DB/models/Expense.model.js";
import { RevenueModel } from "../../../../DB/models/Revenue.model.js";
import logger from "../../../utils/logService.js";

/**
 * Financial Overview for Charts
 * Returns income, expenses, and profit breakdown by month, quarter, and year
 * @query {string} period - 'monthly', 'quarterly', or 'yearly' (default: 'monthly')
 * @query {number} year - Year to filter (default: current year)
 */
export const getFinancialOverview = async (req, res, next) => {
  try {
    // Get query parameters
    const { period = 'monthly', year } = req.query;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();

    // Validate period
    if (!['monthly', 'quarterly', 'yearly'].includes(period)) {
      return res.status(400).json({
        message: "Invalid period. Must be 'monthly', 'quarterly', or 'yearly'"
      });
    }

    let financialData = {};

    if (period === 'monthly') {
      // Monthly breakdown for the specified year
      const [monthlyIncome, monthlyExpenses, monthlyRevenue] = await Promise.all([
        // Insurance income by month
        insuredModel.aggregate([
          { $unwind: "$vehicles" },
          { $unwind: "$vehicles.insurance" },
          {
            $project: {
              year: { $year: "$vehicles.insurance.insuranceStartDate" },
              month: { $month: "$vehicles.insurance.insuranceStartDate" },
              paidAmount: "$vehicles.insurance.paidAmount"
            }
          },
          {
            $match: {
              year: targetYear
            }
          },
          {
            $group: {
              _id: { year: "$year", month: "$month" },
              totalIncome: { $sum: "$paidAmount" }
            }
          },
          { $sort: { "_id.month": 1 } }
        ]),

        // Expenses by month
        ExpenseModel.aggregate([
          {
            $project: {
              year: { $year: "$date" },
              month: { $month: "$date" },
              amount: 1
            }
          },
          {
            $match: {
              year: targetYear
            }
          },
          {
            $group: {
              _id: { year: "$year", month: "$month" },
              totalExpenses: { $sum: "$amount" }
            }
          },
          { $sort: { "_id.month": 1 } }
        ]),

        // Other revenue by month
        RevenueModel.aggregate([
          {
            $project: {
              year: { $year: "$date" },
              month: { $month: "$date" },
              amount: 1
            }
          },
          {
            $match: {
              year: targetYear
            }
          },
          {
            $group: {
              _id: { year: "$year", month: "$month" },
              totalRevenue: { $sum: "$amount" }
            }
          },
          { $sort: { "_id.month": 1 } }
        ])
      ]);

      // Create monthly data array (12 months)
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlyData = [];

      for (let month = 1; month <= 12; month++) {
        const incomeData = monthlyIncome.find(item => item._id.month === month);
        const expenseData = monthlyExpenses.find(item => item._id.month === month);
        const revenueData = monthlyRevenue.find(item => item._id.month === month);

        const insuranceIncome = incomeData ? incomeData.totalIncome : 0;
        const otherRevenue = revenueData ? revenueData.totalRevenue : 0;
        const totalIncome = insuranceIncome + otherRevenue;
        const expenses = expenseData ? expenseData.totalExpenses : 0;
        const profit = totalIncome - expenses;

        monthlyData.push({
          period: monthNames[month - 1],
          month: month,
          year: targetYear,
          income: totalIncome,
          insuranceIncome,
          otherRevenue,
          expenses,
          profit
        });
      }

      financialData = {
        period: 'monthly',
        year: targetYear,
        data: monthlyData,
        summary: {
          totalIncome: monthlyData.reduce((sum, item) => sum + item.income, 0),
          totalExpenses: monthlyData.reduce((sum, item) => sum + item.expenses, 0),
          totalProfit: monthlyData.reduce((sum, item) => sum + item.profit, 0)
        }
      };

    } else if (period === 'quarterly') {
      // Quarterly breakdown for the specified year
      const [quarterlyIncome, quarterlyExpenses, quarterlyRevenue] = await Promise.all([
        // Insurance income by quarter
        insuredModel.aggregate([
          { $unwind: "$vehicles" },
          { $unwind: "$vehicles.insurance" },
          {
            $project: {
              year: { $year: "$vehicles.insurance.insuranceStartDate" },
              quarter: {
                $ceil: {
                  $divide: [{ $month: "$vehicles.insurance.insuranceStartDate" }, 3]
                }
              },
              paidAmount: "$vehicles.insurance.paidAmount"
            }
          },
          {
            $match: {
              year: targetYear
            }
          },
          {
            $group: {
              _id: { year: "$year", quarter: "$quarter" },
              totalIncome: { $sum: "$paidAmount" }
            }
          },
          { $sort: { "_id.quarter": 1 } }
        ]),

        // Expenses by quarter
        ExpenseModel.aggregate([
          {
            $project: {
              year: { $year: "$date" },
              quarter: {
                $ceil: {
                  $divide: [{ $month: "$date" }, 3]
                }
              },
              amount: 1
            }
          },
          {
            $match: {
              year: targetYear
            }
          },
          {
            $group: {
              _id: { year: "$year", quarter: "$quarter" },
              totalExpenses: { $sum: "$amount" }
            }
          },
          { $sort: { "_id.quarter": 1 } }
        ]),

        // Other revenue by quarter
        RevenueModel.aggregate([
          {
            $project: {
              year: { $year: "$date" },
              quarter: {
                $ceil: {
                  $divide: [{ $month: "$date" }, 3]
                }
              },
              amount: 1
            }
          },
          {
            $match: {
              year: targetYear
            }
          },
          {
            $group: {
              _id: { year: "$year", quarter: "$quarter" },
              totalRevenue: { $sum: "$amount" }
            }
          },
          { $sort: { "_id.quarter": 1 } }
        ])
      ]);

      // Create quarterly data array (4 quarters)
      const quarterNames = ['Q1', 'Q2', 'Q3', 'Q4'];
      const quarterlyData = [];

      for (let quarter = 1; quarter <= 4; quarter++) {
        const incomeData = quarterlyIncome.find(item => item._id.quarter === quarter);
        const expenseData = quarterlyExpenses.find(item => item._id.quarter === quarter);
        const revenueData = quarterlyRevenue.find(item => item._id.quarter === quarter);

        const insuranceIncome = incomeData ? incomeData.totalIncome : 0;
        const otherRevenue = revenueData ? revenueData.totalRevenue : 0;
        const totalIncome = insuranceIncome + otherRevenue;
        const expenses = expenseData ? expenseData.totalExpenses : 0;
        const profit = totalIncome - expenses;

        quarterlyData.push({
          period: quarterNames[quarter - 1],
          quarter: quarter,
          year: targetYear,
          income: totalIncome,
          insuranceIncome,
          otherRevenue,
          expenses,
          profit
        });
      }

      financialData = {
        period: 'quarterly',
        year: targetYear,
        data: quarterlyData,
        summary: {
          totalIncome: quarterlyData.reduce((sum, item) => sum + item.income, 0),
          totalExpenses: quarterlyData.reduce((sum, item) => sum + item.expenses, 0),
          totalProfit: quarterlyData.reduce((sum, item) => sum + item.profit, 0)
        }
      };

    } else if (period === 'yearly') {
      // Yearly breakdown (last 5 years)
      const currentYear = new Date().getFullYear();
      const startYear = currentYear - 4;

      const [yearlyIncome, yearlyExpenses, yearlyRevenue] = await Promise.all([
        // Insurance income by year
        insuredModel.aggregate([
          { $unwind: "$vehicles" },
          { $unwind: "$vehicles.insurance" },
          {
            $project: {
              year: { $year: "$vehicles.insurance.insuranceStartDate" },
              paidAmount: "$vehicles.insurance.paidAmount"
            }
          },
          {
            $match: {
              year: { $gte: startYear, $lte: currentYear }
            }
          },
          {
            $group: {
              _id: { year: "$year" },
              totalIncome: { $sum: "$paidAmount" }
            }
          },
          { $sort: { "_id.year": 1 } }
        ]),

        // Expenses by year
        ExpenseModel.aggregate([
          {
            $project: {
              year: { $year: "$date" },
              amount: 1
            }
          },
          {
            $match: {
              year: { $gte: startYear, $lte: currentYear }
            }
          },
          {
            $group: {
              _id: { year: "$year" },
              totalExpenses: { $sum: "$amount" }
            }
          },
          { $sort: { "_id.year": 1 } }
        ]),

        // Other revenue by year
        RevenueModel.aggregate([
          {
            $project: {
              year: { $year: "$date" },
              amount: 1
            }
          },
          {
            $match: {
              year: { $gte: startYear, $lte: currentYear }
            }
          },
          {
            $group: {
              _id: { year: "$year" },
              totalRevenue: { $sum: "$amount" }
            }
          },
          { $sort: { "_id.year": 1 } }
        ])
      ]);

      // Create yearly data array (last 5 years)
      const yearlyData = [];

      for (let year = startYear; year <= currentYear; year++) {
        const incomeData = yearlyIncome.find(item => item._id.year === year);
        const expenseData = yearlyExpenses.find(item => item._id.year === year);
        const revenueData = yearlyRevenue.find(item => item._id.year === year);

        const insuranceIncome = incomeData ? incomeData.totalIncome : 0;
        const otherRevenue = revenueData ? revenueData.totalRevenue : 0;
        const totalIncome = insuranceIncome + otherRevenue;
        const expenses = expenseData ? expenseData.totalExpenses : 0;
        const profit = totalIncome - expenses;

        yearlyData.push({
          period: year.toString(),
          year: year,
          income: totalIncome,
          insuranceIncome,
          otherRevenue,
          expenses,
          profit
        });
      }

      financialData = {
        period: 'yearly',
        yearRange: `${startYear}-${currentYear}`,
        data: yearlyData,
        summary: {
          totalIncome: yearlyData.reduce((sum, item) => sum + item.income, 0),
          totalExpenses: yearlyData.reduce((sum, item) => sum + item.expenses, 0),
          totalProfit: yearlyData.reduce((sum, item) => sum + item.profit, 0)
        }
      };
    }

    return res.status(200).json({
      message: "Financial overview retrieved successfully",
      timestamp: new Date().toISOString(),
      ...financialData
    });

  } catch (error) {
    logger.error("Error fetching financial overview:", error);
    next(error);
  }
};
