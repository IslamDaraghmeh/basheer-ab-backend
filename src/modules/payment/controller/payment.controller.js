import TranzilaPayment from "#services/tranzilaService.js";
import logger from "#utils/logService.js";
import { asyncHandler } from "#utils/asyncHandler.js";
import { logAudit } from "#utils/auditLogger.js";
import {
  successResponse,
  badRequestResponse
} from "#utils/apiResponse.js";

// Initialize Tranzila payment service
// Configuration should come from environment variables
const getTranzilaInstance = () => {
  return new TranzilaPayment({
    appKey: process.env.TRANZILA_APP_KEY,
    secret: process.env.TRANZILA_SECRET,
    terminalName: process.env.TRANZILA_TERMINAL_NAME,
    environment: process.env.TRANZILA_ENVIRONMENT || 'sandbox'
  });
};

/**
 * Create a one-time payment
 * POST /api/payment/tranzila/create
 */
export const createPayment = asyncHandler(async (req, res) => {
  const {
    amount,
    currency,
    card,
    orderId,
    description,
    customer,
    installments,
    threeDSecure,
    metadata
  } = req.body;

  // Validate required fields
  if (!amount || !currency || !card) {
    return badRequestResponse(res, "Missing required fields: amount, currency, and card are required");
  }

  // Validate card object
  if (!card.number || !card.expiryMonth || !card.expiryYear || !card.cvv) {
    return badRequestResponse(res, "Missing required card fields: number, expiryMonth, expiryYear, and cvv are required");
  }

  // Validate card number using Luhn algorithm
  if (!TranzilaPayment.validateCardNumber(card.number)) {
    return badRequestResponse(res, "Invalid card number");
  }

  const tranzila = getTranzilaInstance();

  const paymentData = {
    amount,
    currency,
    card,
    orderId,
    description,
    customer,
    installments,
    threeDSecure,
    metadata
  };

  const result = await tranzila.createOneTimePayment(paymentData);

  // Mask card number before logging/storing
  const maskedCardNumber = TranzilaPayment.maskCardNumber(card.number);

  if (result.success) {
    logger.info("Payment processed successfully", {
      orderId,
      amount,
      currency,
      maskedCardNumber,
      transactionId: result.transactionId
    });

    return successResponse(res, {
      ...result.data,
      maskedCardNumber,
      requiresThreeDS: result.requiresThreeDS,
      redirectUrl: result.redirectUrl,
      transactionId: result.transactionId,
      // Return full Tranzila response
      tranzilaResponse: {
        success: result.success,
        statusCode: result.statusCode,
        data: result.data,
        requiresThreeDS: result.requiresThreeDS,
        redirectUrl: result.redirectUrl,
        transactionId: result.transactionId,
        message: result.message
      }
    }, result.requiresThreeDS
      ? "Transaction requires 3D Secure authentication"
      : "Payment processed successfully");
  } else {
    logger.error("Payment failed", {
      orderId,
      amount,
      currency,
      maskedCardNumber,
      error: result.error
    });

    return badRequestResponse(res, result.message || "Payment failed", {
      error: result.error,
      // Return full Tranzila error response
      tranzilaResponse: {
        success: result.success,
        statusCode: result.statusCode,
        error: result.error,
        message: result.message,
        details: result.details
      }
    });
  }
});

/**
 * Verify transaction status
 * GET /api/payment/tranzila/verify/:transactionId
 */
export const verifyTransaction = asyncHandler(async (req, res) => {
  const { transactionId } = req.params;

  if (!transactionId) {
    return badRequestResponse(res, "Transaction ID is required");
  }

  const tranzila = getTranzilaInstance();
  const result = await tranzila.verifyTransaction(transactionId);

  if (result.success) {
    logger.info("Transaction verified successfully", { transactionId });

    return successResponse(res, {
      ...result.data,
      // Return full Tranzila response
      tranzilaResponse: {
        success: result.success,
        statusCode: result.statusCode,
        data: result.data
      }
    }, "Transaction verified successfully");
  } else {
    logger.warn("Transaction verification failed", { transactionId, error: result.error });

    return badRequestResponse(res, result.error || "Transaction verification failed", {
      details: result.details,
      // Return full Tranzila error response
      tranzilaResponse: {
        success: result.success,
        statusCode: result.statusCode,
        error: result.error,
        details: result.details
      }
    });
  }
});

/**
 * Void/Cancel a transaction
 * POST /api/payment/tranzila/void/:transactionId
 */
export const voidTransaction = asyncHandler(async (req, res) => {
  const { transactionId } = req.params;

  if (!transactionId) {
    return badRequestResponse(res, "Transaction ID is required");
  }

  const tranzila = getTranzilaInstance();
  const result = await tranzila.voidTransaction(transactionId);

  if (result.success) {
    logger.info("Transaction voided successfully", { transactionId });

    return successResponse(res, {
      ...result.data,
      // Return full Tranzila response
      tranzilaResponse: {
        success: result.success,
        statusCode: result.statusCode,
        data: result.data
      }
    }, "Transaction voided successfully");
  } else {
    logger.warn("Transaction void failed", { transactionId, error: result.error });

    return badRequestResponse(res, result.error || "Transaction void failed", {
      details: result.details,
      // Return full Tranzila error response
      tranzilaResponse: {
        success: result.success,
        statusCode: result.statusCode,
        error: result.error,
        details: result.details
      }
    });
  }
});

/**
 * Validate card number
 * POST /api/payment/tranzila/validate-card
 */
export const validateCard = asyncHandler(async (req, res) => {
  const { cardNumber } = req.body;

  if (!cardNumber) {
    return badRequestResponse(res, "Card number is required");
  }

  const isValid = TranzilaPayment.validateCardNumber(cardNumber);
  const maskedNumber = TranzilaPayment.maskCardNumber(cardNumber);

  logger.info("Card validation performed", { maskedNumber, isValid });

  return successResponse(res, {
    valid: isValid,
    maskedCardNumber: maskedNumber
  }, "Card validation completed");
});
