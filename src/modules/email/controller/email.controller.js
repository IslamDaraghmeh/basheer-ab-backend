import { EmailModel } from "../../../../DB/models/Email.model.js";
import {
  fetchInbox,
  sendSingleEmail,
  sendBulkEmails,
} from "../../../services/emailService.js";

// Get inbox with pagination
export const getInbox = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await fetchInbox(page, limit);

    // Optionally save emails to database
    for (const email of result.emails) {
      await EmailModel.findOneAndUpdate(
        { messageId: email.messageId },
        {
          messageId: email.messageId,
          from: email.from,
          to: [email.to],
          subject: email.subject,
          body: email.text,
          htmlBody: email.html,
          receivedDate: email.date,
          status: "received",
          isRead: false,
          attachments: email.attachments,
        },
        { upsert: true, new: true }
      );
    }

    res.status(200).json({
      message: "Inbox fetched successfully",
      data: result.emails,
      pagination: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    console.error("Error fetching inbox:", error);
    next(error);
  }
};

// Send single email
export const sendEmail = async (req, res, next) => {
  try {
    const { to, cc, bcc, subject, text, html, attachments } = req.body;

    if (!to || !subject) {
      return res
        .status(400)
        .json({ message: "Recipient (to) and subject are required" });
    }

    const emailData = {
      to,
      cc,
      bcc,
      subject,
      text,
      html,
      attachments,
    };

    const result = await sendSingleEmail(emailData);

    if (result.success) {
      // Save to database
      const email = new EmailModel({
        messageId: result.messageId,
        from: process.env.GMAIL_USER || "basheerinsurance99@gmail.com",
        to: Array.isArray(to) ? to : [to],
        cc: cc || [],
        bcc: bcc || [],
        subject,
        body: text,
        htmlBody: html,
        sentDate: new Date(),
        status: "sent",
        isSent: true,
        attachments: attachments || [],
      });
      await email.save();

      res.status(200).json({
        message: "Email sent successfully",
        messageId: result.messageId,
        email,
      });
    } else {
      res.status(500).json({
        message: "Failed to send email",
        error: result.error,
      });
    }
  } catch (error) {
    console.error("Error sending email:", error);
    next(error);
  }
};

// Send bulk emails
export const sendBulkEmail = async (req, res, next) => {
  try {
    const { recipients, subject, text, html, attachments } = req.body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ message: "Recipients array is required" });
    }

    if (!subject) {
      return res.status(400).json({ message: "Subject is required" });
    }

    const emailTemplate = {
      subject,
      text,
      html,
      attachments,
    };

    const results = await sendBulkEmails(recipients, emailTemplate);

    // Save successful emails to database
    for (const result of results) {
      if (result.success) {
        const email = new EmailModel({
          messageId: result.messageId,
          from: process.env.GMAIL_USER || "basheerinsurance99@gmail.com",
          to: [result.email],
          subject,
          body: text,
          htmlBody: html,
          sentDate: new Date(),
          status: "sent",
          isSent: true,
          attachments: attachments || [],
        });
        await email.save();
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    res.status(200).json({
      message: "Bulk email process completed",
      summary: {
        total: results.length,
        successful: successCount,
        failed: failureCount,
      },
      results,
    });
  } catch (error) {
    console.error("Error sending bulk emails:", error);
    next(error);
  }
};

// Get all emails from database
export const getAllEmails = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status; // filter by status (sent, received, draft, failed)

    const filter = {};
    if (status) {
      filter.status = status;
    }

    const total = await EmailModel.countDocuments(filter);
    const emails = await EmailModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    res.status(200).json({
      message: "Emails fetched successfully",
      emails,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching emails:", error);
    next(error);
  }
};

// Get single email by ID
export const getEmailById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const email = await EmailModel.findById(id);

    if (!email) {
      return res.status(404).json({ message: "Email not found" });
    }

    // Mark as read
    if (!email.isRead && email.status === "received") {
      email.isRead = true;
      await email.save();
    }

    res.status(200).json({ message: "Email fetched successfully", email });
  } catch (error) {
    console.error("Error fetching email:", error);
    next(error);
  }
};

// Delete email
export const deleteEmail = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deleted = await EmailModel.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Email not found" });
    }

    res.status(200).json({ message: "Email deleted successfully" });
  } catch (error) {
    console.error("Error deleting email:", error);
    next(error);
  }
};
