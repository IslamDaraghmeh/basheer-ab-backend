import { EmailModel } from "#db/models/Email.model.js";
import {
  fetchInbox,
  sendSingleEmail,
  sendBulkEmails,
} from "#services/emailService.js";
import { asyncHandler } from "#utils/asyncHandler.js";
import { logAudit } from "#utils/auditLogger.js";
import {
  successResponse,
  notFoundResponse,
  badRequestResponse
} from "#utils/apiResponse.js";

// Get inbox with pagination
export const getInbox = asyncHandler(async (req, res) => {
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

  return successResponse(res, {
    emails: result.emails,
    pagination: {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    }
  }, "Inbox fetched successfully");
});

// Send single email
export const sendEmail = asyncHandler(async (req, res) => {
  const { to, cc, bcc, subject, text, html, attachments } = req.body;

  if (!to || !subject) {
    return badRequestResponse(res, "Recipient (to) and subject are required");
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

    return successResponse(res, {
      messageId: result.messageId,
      email
    }, "Email sent successfully");
  } else {
    return badRequestResponse(res, "Failed to send email", result.error);
  }
});

// Send bulk emails
export const sendBulkEmail = asyncHandler(async (req, res) => {
  const { recipients, subject, text, html, attachments } = req.body;

  if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
    return badRequestResponse(res, "Recipients array is required");
  }

  if (!subject) {
    return badRequestResponse(res, "Subject is required");
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

  return successResponse(res, {
    summary: {
      total: results.length,
      successful: successCount,
      failed: failureCount,
    },
    results
  }, "Bulk email process completed");
});

// Get all emails from database
export const list = asyncHandler(async (req, res) => {
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

  return successResponse(res, {
    emails,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }, "Emails fetched successfully");
});

// Get single email by ID
export const getEmailById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const email = await EmailModel.findById(id);

  if (!email) {
    return notFoundResponse(res, "Email");
  }

  // Mark as read
  if (!email.isRead && email.status === "received") {
    email.isRead = true;
    await email.save();
  }

  return successResponse(res, { email }, "Email fetched successfully");
});

// Delete email
export const deleteEmail = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const deleted = await EmailModel.findByIdAndDelete(id);

  if (!deleted) {
    return notFoundResponse(res, "Email");
  }

  return successResponse(res, null, "Email deleted successfully");
});
