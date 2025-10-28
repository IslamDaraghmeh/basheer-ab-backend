import { Router } from "express";
import * as paymentController from './controller/payment.controller.js';

const paymentRouter = Router();

// Create a one-time payment
paymentRouter.post('/tranzila/create', paymentController.createPayment);

// Verify transaction status
paymentRouter.get('/tranzila/verify/:transactionId', paymentController.verifyTransaction);

// Void/Cancel a transaction
paymentRouter.post('/tranzila/void/:transactionId', paymentController.voidTransaction);

// Validate card number
paymentRouter.post('/tranzila/validate-card', paymentController.validateCard);

export default paymentRouter;
