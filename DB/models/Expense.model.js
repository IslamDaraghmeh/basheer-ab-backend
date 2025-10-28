import mongoose, { Schema } from "mongoose";

const expenseSchema = new Schema(
  {
    title: { type: String, required: true },
    amount: { type: Number, required: true },
    paidBy: { type: String, required: true },
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "cheque", "bank_transfer"],
      default: "cash",
    },
    status: {
      type: String,
      enum: ["pending", "paid", "cancelled"],
      default: "paid",
    },
    date: { type: Date, default: Date.now },
    receiptNumber: { type: String },
    description: { type: String },
  },
  { timestamps: true }
);

// Indexes for better query performance
expenseSchema.index({ date: -1 });
expenseSchema.index({ paymentMethod: 1 });
expenseSchema.index({ status: 1 });
expenseSchema.index({ paidBy: 1 });

export const ExpenseModel = mongoose.model("Expense", expenseSchema);
