import mongoose from "mongoose";

const emailSchema = new mongoose.Schema(
  {
    messageId: { type: String, unique: true },
    from: { type: String, required: true },
    to: [{ type: String, required: true }],
    cc: [{ type: String }],
    bcc: [{ type: String }],
    subject: { type: String, required: true },
    body: { type: String },
    htmlBody: { type: String },
    attachments: [
      {
        filename: { type: String },
        path: { type: String },
        contentType: { type: String },
      },
    ],
    receivedDate: { type: Date },
    sentDate: { type: Date },
    isRead: { type: Boolean, default: false },
    isSent: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["draft", "sent", "failed", "received"],
      default: "draft",
    },
  },
  { timestamps: true }
);

export const EmailModel = mongoose.model("Email", emailSchema);
