import https from 'https';
import crypto from 'crypto';

class TranzilaPayment {
    constructor(config) {
        this.config = {
            appKey: config.appKey,
            secret: config.secret,
            terminalName: config.terminalName,
            environment: config.environment || 'sandbox', // 'sandbox' or 'production'
            baseUrl: config.environment === 'production'
                ? 'https://api.tranzila.com'
                : 'https://api-sandbox.tranzila.com'
        };

        if (!this.config.appKey || !this.config.secret || !this.config.terminalName) {
            throw new Error('Missing required configuration: appKey, secret, and terminalName are required');
        }
    }

    /**
     * Generate authentication signature
     * @param {string} method - HTTP method
     * @param {string} url - Request URL
     * @param {string} timestamp - Unix timestamp
     * @param {string} body - Request body
     * @returns {string} - Authentication signature
     */
    generateSignature(method, url, timestamp, body = '') {
        const stringToSign = `${method}\n${url}\n${timestamp}\n${body}`;
        return crypto.createHmac('sha256', this.config.secret)
            .update(stringToSign)
            .digest('base64');
    }

    /**
     * Make HTTP request to Tranzila API
     * @param {string} endpoint - API endpoint
     * @param {string} method - HTTP method
     * @param {object} data - Request data
     * @returns {Promise} - API response
     */
    makeRequest(endpoint, method = 'POST', data = null) {
        return new Promise((resolve, reject) => {
            const timestamp = Math.floor(Date.now() / 1000).toString();
            const url = `${this.config.baseUrl}${endpoint}`;
            const body = data ? JSON.stringify(data) : '';

            const signature = this.generateSignature(method, endpoint, timestamp, body);

            const options = {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-tranzila-api-app-key': this.config.appKey,
                    'X-tranzila-timestamp': timestamp,
                    'X-tranzila-signature': signature,
                    'X-tranzila-terminal': this.config.terminalName
                }
            };

            if (body) {
                options.headers['Content-Length'] = Buffer.byteLength(body);
            }

            const req = https.request(url, options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    try {
                        const parsedResponse = JSON.parse(responseData);

                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve({
                                success: true,
                                statusCode: res.statusCode,
                                data: parsedResponse
                            });
                        } else {
                            resolve({
                                success: false,
                                statusCode: res.statusCode,
                                error: parsedResponse,
                                message: parsedResponse.message || 'Transaction failed'
                            });
                        }
                    } catch (parseError) {
                        reject({
                            success: false,
                            error: 'Invalid JSON response',
                            rawResponse: responseData,
                            parseError: parseError.message
                        });
                    }
                });
            });

            req.on('error', (error) => {
                reject({
                    success: false,
                    error: 'Network error',
                    details: error.message
                });
            });

            if (body) {
                req.write(body);
            }

            req.end();
        });
    }

    /**
     * Create a one-time payment transaction
     * @param {object} paymentData - Payment details
     * @returns {Promise} - Transaction response
     */
    async createOneTimePayment(paymentData) {
        // Validate required fields
        const requiredFields = ['amount', 'currency', 'card'];
        for (const field of requiredFields) {
            if (!paymentData[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        // Validate card details
        const requiredCardFields = ['number', 'expiryMonth', 'expiryYear', 'cvv'];
        for (const field of requiredCardFields) {
            if (!paymentData.card[field]) {
                throw new Error(`Missing required card field: ${field}`);
            }
        }

        const requestData = {
            transaction_type: 'purchase', // One-time payment
            amount: parseFloat(paymentData.amount),
            currency: paymentData.currency || 'ILS',
            card: {
                number: paymentData.card.number.replace(/\s/g, ''), // Remove spaces
                expiry_month: parseInt(paymentData.card.expiryMonth),
                expiry_year: parseInt(paymentData.card.expiryYear),
                cvv: paymentData.card.cvv
            },
            // Optional fields
            order_id: paymentData.orderId,
            description: paymentData.description,
            customer: paymentData.customer ? {
                name: paymentData.customer.name,
                email: paymentData.customer.email,
                phone: paymentData.customer.phone,
                address: paymentData.customer.address
            } : undefined,
            // Installments support
            installments: paymentData.installments ? {
                number_of_payments: paymentData.installments.numberOfPayments
            } : undefined,
            // 3D Secure settings
            three_ds: paymentData.threeDSecure !== false, // Enable by default
            // Additional metadata
            metadata: paymentData.metadata
        };

        try {
            const response = await this.makeRequest('/v2/transactions', 'POST', requestData);

            // Handle 3D Secure redirect if required
            if (response.data && response.data.three_ds_required) {
                return {
                    success: true,
                    requiresThreeDS: true,
                    redirectUrl: response.data.three_ds_redirect_url,
                    transactionId: response.data.transaction_id,
                    message: 'Transaction requires 3D Secure authentication'
                };
            }

            return response;
        } catch (error) {
            return {
                success: false,
                error: error.error || 'Payment processing failed',
                details: error.details || error.message
            };
        }
    }

    /**
     * Verify transaction status
     * @param {string} transactionId - Transaction ID to verify
     * @returns {Promise} - Transaction status
     */
    async verifyTransaction(transactionId) {
        if (!transactionId) {
            throw new Error('Transaction ID is required');
        }

        try {
            const response = await this.makeRequest(`/v2/transactions/${transactionId}`, 'GET');
            return response;
        } catch (error) {
            return {
                success: false,
                error: error.error || 'Transaction verification failed',
                details: error.details || error.message
            };
        }
    }

    /**
     * Void/Cancel a transaction (if supported)
     * @param {string} transactionId - Transaction ID to void
     * @returns {Promise} - Void response
     */
    async voidTransaction(transactionId) {
        if (!transactionId) {
            throw new Error('Transaction ID is required');
        }

        try {
            const response = await this.makeRequest(`/v2/transactions/${transactionId}/void`, 'POST');
            return response;
        } catch (error) {
            return {
                success: false,
                error: error.error || 'Transaction void failed',
                details: error.details || error.message
            };
        }
    }

    /**
     * Format card number for display (mask middle digits)
     * @param {string} cardNumber - Full card number
     * @returns {string} - Masked card number
     */
    static maskCardNumber(cardNumber) {
        const cleaned = cardNumber.replace(/\s/g, '');
        if (cleaned.length < 8) return cleaned;

        const firstFour = cleaned.slice(0, 4);
        const lastFour = cleaned.slice(-4);
        const middle = '*'.repeat(cleaned.length - 8);

        return `${firstFour}${middle}${lastFour}`;
    }

    /**
     * Validate card number using Luhn algorithm
     * @param {string} cardNumber - Card number to validate
     * @returns {boolean} - Whether card number is valid
     */
    static validateCardNumber(cardNumber) {
        const cleaned = cardNumber.replace(/\s/g, '');
        if (!/^\d+$/.test(cleaned)) return false;

        let sum = 0;
        let alternate = false;

        for (let i = cleaned.length - 1; i >= 0; i--) {
            let digit = parseInt(cleaned.charAt(i));

            if (alternate) {
                digit *= 2;
                if (digit > 9) digit -= 9;
            }

            sum += digit;
            alternate = !alternate;
        }

        return sum % 10 === 0;
    }
}

export default TranzilaPayment;
