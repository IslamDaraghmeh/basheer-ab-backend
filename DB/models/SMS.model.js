import mongoose from "mongoose";

const smsSchema = new mongoose.Schema(
  {
    phoneNumber: { type: String, required: true },
    message: { type: String, required: true },
    messageId: { type: String },
    status: {
      type: String,
      enum: ["pending", "sent", "failed", "delivered"],
      default: "pending",
    },
    dlr: { type: String },
    sentDate: { type: Date },
    deliveredDate: { type: Date },
    errorMessage: { type: String },
    isBulk: { type: Boolean, default: false },
    bulkBatchId: { type: String },
  },
  { timestamps: true }
);

export const SMSModel = mongoose.model("SMS", smsSchema);
