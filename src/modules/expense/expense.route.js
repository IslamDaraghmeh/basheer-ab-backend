import { Router } from "express";
import * as expenseRoute from './controller/expense.controller.js';
import { validateRequest } from "../../middleware/validateRequest.js";
import * as validation from "./expense.validation.js";
import { cacheMiddleware, paginationCacheKey } from "../../middleware/cacheMiddleware.js";

const expenseRouter = Router();

// Expense CRUD operations
expenseRouter.post('/addExpense', validateRequest(validation.addExpenseSchema), expenseRoute.addExpense);
expenseRouter.get('/getExpenses', expenseRoute.getExpenses);
expenseRouter.get('/all', cacheMiddleware(300, paginationCacheKey), validateRequest(validation.expenseFiltersSchema, 'query'), expenseRoute.getExpensesWithFilters);
expenseRouter.put('/:id', validateRequest(validation.updateExpenseSchema), expenseRoute.updateExpense);
expenseRouter.delete('/:id', expenseRoute.deleteExpense);

// Financial reports
expenseRouter.get('/getNetProfit', expenseRoute.getNetProfit);
expenseRouter.get('/getCompanyFinancialReport', expenseRoute.getCompanyFinancialReport);

// Insurance cancellation
expenseRouter.patch('/cancelInsurance/:insuredId/:vehicleId/:insuranceId', validateRequest(validation.cancelInsuranceSchema), expenseRoute.cancelInsurance);

export default expenseRouter;