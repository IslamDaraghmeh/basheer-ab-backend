import Imap from "imap";
import { simpleParser } from "mailparser";
import nodemailer from "nodemailer";

// Gmail IMAP Configuration
const imapConfig = {
  user: process.env.GMAIL_USER || "basheerinsurance99@gmail.com",
  password: process.env.GMAIL_APP_PASSWORD || "aobg elxm xxdr ejhc",
  host: "imap.gmail.com",
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false },
};

// Gmail SMTP Configuration (using nodemailer)
const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER || "basheerinsurance99@gmail.com",
      pass: process.env.GMAIL_APP_PASSWORD || "aobg elxm xxdr ejhc",
    },
  });
};

// Fetch emails from inbox with pagination
export const fetchInbox = (page = 1, limit = 10) => {
  return new Promise((resolve, reject) => {
    const imap = new Imap(imapConfig);
    const emails = [];

    imap.once("ready", () => {
      imap.openBox("INBOX", true, (err, box) => {
        if (err) {
          imap.end();
          return reject(err);
        }

        const totalMessages = box.messages.total;
        if (totalMessages === 0) {
          imap.end();
          return resolve({ emails: [], total: 0, page, limit });
        }

        // Calculate range for pagination
        const start = Math.max(1, totalMessages - page * limit + 1);
        const end = Math.max(1, totalMessages - (page - 1) * limit);

        if (start > totalMessages || start > end) {
          imap.end();
          return resolve({ emails: [], total: totalMessages, page, limit });
        }

        const fetch = imap.seq.fetch(`${start}:${end}`, {
          bodies: "",
          struct: true,
        });

        fetch.on("message", (msg) => {
          msg.on("body", (stream) => {
            simpleParser(stream, (err, parsed) => {
              if (err) {
                console.error("Error parsing email:", err);
                return;
              }

              emails.push({
                messageId: parsed.messageId,
                from: parsed.from?.text || "",
                to: parsed.to?.text || "",
                subject: parsed.subject || "No Subject",
                date: parsed.date,
                text: parsed.text || "",
                html: parsed.html || "",
                attachments:
                  parsed.attachments?.map((att) => ({
                    filename: att.filename,
                    contentType: att.contentType,
                    size: att.size,
                  })) || [],
              });
            });
          });
        });

        fetch.once("error", (err) => {
          imap.end();
          reject(err);
        });

        fetch.once("end", () => {
          imap.end();
          resolve({
            emails: emails.reverse(),
            total: totalMessages,
            page,
            limit,
            totalPages: Math.ceil(totalMessages / limit),
          });
        });
      });
    });

    imap.once("error", (err) => {
      reject(err);
    });

    imap.connect();
  });
};

// Send single email
export const sendSingleEmail = async (emailData) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.GMAIL_USER || "basheerinsurance99@gmail.com",
    to: emailData.to,
    cc: emailData.cc,
    bcc: emailData.bcc,
    subject: emailData.subject,
    text: emailData.text,
    html: emailData.html,
    attachments: emailData.attachments,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return {
      success: true,
      messageId: info.messageId,
      response: info.response,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

// Send bulk emails
export const sendBulkEmails = async (recipients, emailTemplate) => {
  const transporter = createTransporter();
  const results = [];

  for (const recipient of recipients) {
    const mailOptions = {
      from: process.env.GMAIL_USER || "basheerinsurance99@gmail.com",
      to: recipient.email,
      subject: emailTemplate.subject,
      text: emailTemplate.text?.replace(/{{name}}/g, recipient.name || ""),
      html: emailTemplate.html?.replace(/{{name}}/g, recipient.name || ""),
      attachments: emailTemplate.attachments,
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      results.push({
        email: recipient.email,
        success: true,
        messageId: info.messageId,
      });
    } catch (error) {
      results.push({
        email: recipient.email,
        success: false,
        error: error.message,
      });
    }
  }

  return results;
};
