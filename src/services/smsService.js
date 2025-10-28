import axios from "axios";

// SMS configuration class
class SMSService {
  constructor() {
    this.apiUrl =
      process.env.SMS_API_URL || "https://www.019sms.co.il:8090/api";
    this.username = process.env.SMS_USERNAME || "ab.stop";
    this.password = process.env.SMS_PASSWORD || "3ssX1Ud0:6";
    this.source = process.env.SMS_SOURCE || "0546060886";
    this.isConfigured = this.validateConfiguration();
  }

  // Validate SMS configuration
  validateConfiguration() {
    if (!this.username || !this.password || !this.source) {
      console.warn("SMS configuration missing. SMS service will not work.");
      return false;
    }
    console.info("SMS service configured successfully");
    return true;
  }

  // Generate XML for SMS request
  generateSMSXML(phoneNumber, message, dlr = "") {
    return `<?xml version="1.0" encoding="UTF-8"?>
<sms>
    <user>
        <username>${this.username}</username>
        <password>${this.password}</password>
    </user>
    <source>${this.source}</source>
    <destinations>
        <phone id="${dlr}">${phoneNumber}</phone>
    </destinations>
    <message>${message}</message>
</sms>`;
  }

  // Send single SMS
  async sendSingleSMS(phoneNumber, message, dlr = "") {
    if (!this.isConfigured) {
      throw new Error(
        "SMS service not configured. Please check SMS_USERNAME, SMS_PASSWORD, and SMS_SOURCE environment variables."
      );
    }

    try {
      const xml = this.generateSMSXML(phoneNumber, message, dlr);

      const response = await axios.post(this.apiUrl, xml, {
        headers: {
          "Content-Type": "application/xml",
          charset: "utf-8",
        },
        timeout: 30000, // 30 seconds timeout
      });

      console.info(`SMS sent successfully to ${phoneNumber}`, {
        response: response.data,
        status: response.status,
      });

      // Extract messageId - handle both string and object responses
      let messageId = "";
      if (typeof response.data === "string") {
        messageId = response.data;
      } else if (typeof response.data === "object" && response.data.shipment_id) {
        messageId = response.data.shipment_id;
      } else {
        messageId = JSON.stringify(response.data);
      }

      return {
        success: true,
        messageId: messageId,
        phoneNumber: phoneNumber,
        status: "sent",
        responseData: response.data,
      };
    } catch (error) {
      console.error("Failed to send SMS:", {
        error: error.message,
        phoneNumber: phoneNumber,
        response: error.response?.data,
      });

      throw new Error(`Failed to send SMS: ${error.message}`);
    }
  }

  // Send bulk SMS
  async sendBulkSMS(recipients, message) {
    if (!this.isConfigured) {
      throw new Error(
        "SMS service not configured. Please check SMS_USERNAME, SMS_PASSWORD, and SMS_SOURCE environment variables."
      );
    }

    if (!Array.isArray(recipients) || recipients.length === 0) {
      throw new Error("Recipients must be a non-empty array");
    }

    const results = [];
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      const phoneNumber = typeof recipient === "string" ? recipient : recipient.phoneNumber;
      const personalizedMessage = typeof recipient === "object" && recipient.name
        ? message.replace(/{{name}}/g, recipient.name)
        : message;

      try {
        const result = await this.sendSingleSMS(phoneNumber, personalizedMessage);
        results.push({
          phoneNumber: phoneNumber,
          success: true,
          messageId: result.messageId,
          status: "sent",
        });

        // Add delay between SMS to avoid rate limiting
        if (i < recipients.length - 1) {
          await delay(1000); // 1 second delay
        }
      } catch (error) {
        results.push({
          phoneNumber: phoneNumber,
          success: false,
          error: error.message,
          status: "failed",
        });
      }
    }

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.info(
      `Bulk SMS completed: ${successful} successful, ${failed} failed`
    );

    return {
      success: true,
      total: recipients.length,
      successful: successful,
      failed: failed,
      results: results,
    };
  }

  // Test SMS configuration
  async testSMSConfiguration(testPhoneNumber) {
    if (!testPhoneNumber) {
      throw new Error("Test phone number is required");
    }

    const testMessage = "Test message from Insurance System";

    try {
      const result = await this.sendSingleSMS(testPhoneNumber, testMessage, "test");
      return {
        success: true,
        message: "Test SMS sent successfully",
        result: result,
      };
    } catch (error) {
      return {
        success: false,
        message: "Test SMS failed",
        error: error.message,
      };
    }
  }

  // Get SMS service status
  getServiceStatus() {
    return {
      configured: this.isConfigured,
      apiUrl: this.apiUrl,
      username: this.username,
      source: this.source,
    };
  }
}

// Create singleton instance
const smsService = new SMSService();

// Export functions for direct use
export const sendSingleSMS = (phoneNumber, message, dlr) =>
  smsService.sendSingleSMS(phoneNumber, message, dlr);

export const sendBulkSMS = (recipients, message) =>
  smsService.sendBulkSMS(recipients, message);

export const testSMSConfiguration = (testPhoneNumber) =>
  smsService.testSMSConfiguration(testPhoneNumber);

export const getSMSServiceStatus = () => smsService.getServiceStatus();

export default smsService;
