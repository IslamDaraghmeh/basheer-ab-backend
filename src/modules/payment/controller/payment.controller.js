import TranzilaPayment from "../../../services/tranzilaService.js";

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
export const createPayment = async (req, res, next) => {
  try {
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
      return res.status(400).json({
        success: false,
        message: "Missing required fields: amount, currency, and card are required"
      });
    }

    // Validate card object
    if (!card.number || !card.expiryMonth || !card.expiryYear || !card.cvv) {
      return res.status(400).json({
        success: false,
        message: "Missing required card fields: number, expiryMonth, expiryYear, and cvv are required"
      });
    }

    // Validate card number using Luhn algorithm
    if (!TranzilaPayment.validateCardNumber(card.number)) {
      return res.status(400).json({
        success: false,
        message: "Invalid card number"
      });
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
      return res.status(200).json({
        success: true,
        message: result.requiresThreeDS
          ? "Transaction requires 3D Secure authentication"
          : "Payment processed successfully",
        data: {
          ...result.data,
          maskedCardNumber,
          requiresThreeDS: result.requiresThreeDS,
          redirectUrl: result.redirectUrl,
          transactionId: result.transactionId
        },
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
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.message || "Payment failed",
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
  } catch (error) {
    console.error("Payment error:", error);
    next(error);
  }
};

/**
 * Verify transaction status
 * GET /api/payment/tranzila/verify/:transactionId
 */
export const verifyTransaction = async (req, res, next) => {
  try {
    const { transactionId } = req.params;

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        message: "Transaction ID is required"
      });
    }

    const tranzila = getTranzilaInstance();
    const result = await tranzila.verifyTransaction(transactionId);

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: "Transaction verified successfully",
        data: result.data,
        // Return full Tranzila response
        tranzilaResponse: {
          success: result.success,
          statusCode: result.statusCode,
          data: result.data
        }
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.error || "Transaction verification failed",
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
  } catch (error) {
    console.error("Verification error:", error);
    next(error);
  }
};

/**
 * Void/Cancel a transaction
 * POST /api/payment/tranzila/void/:transactionId
 */
export const voidTransaction = async (req, res, next) => {
  try {
    const { transactionId } = req.params;

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        message: "Transaction ID is required"
      });
    }

    const tranzila = getTranzilaInstance();
    const result = await tranzila.voidTransaction(transactionId);

    if (result.success) {
      return res.status(200).json({
        success: true,
        message: "Transaction voided successfully",
        data: result.data,
        // Return full Tranzila response
        tranzilaResponse: {
          success: result.success,
          statusCode: result.statusCode,
          data: result.data
        }
      });
    } else {
      return res.status(400).json({
        success: false,
        message: result.error || "Transaction void failed",
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
  } catch (error) {
    console.error("Void error:", error);
    next(error);
  }
};

/**
 * Validate card number
 * POST /api/payment/tranzila/validate-card
 */
export const validateCard = async (req, res, next) => {
  try {
    const { cardNumber } = req.body;

    if (!cardNumber) {
      return res.status(400).json({
        success: false,
        message: "Card number is required"
      });
    }

    const isValid = TranzilaPayment.validateCardNumber(cardNumber);
    const maskedNumber = TranzilaPayment.maskCardNumber(cardNumber);

    return res.status(200).json({
      success: true,
      valid: isValid,
      maskedCardNumber: maskedNumber
    });
  } catch (error) {
    console.error("Card validation error:", error);
    next(error);
  }
};
