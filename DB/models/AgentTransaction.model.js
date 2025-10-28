import mongoose, { Schema } from "mongoose";

/**
 * Agent Transaction Model
 * Tracks credit/debit transactions between company and agents
 *
 * Types:
 * - "credit": Company owes agent (from_agent insurance - agent sold to customer)
 * - "debit": Agent owes company (to_agent insurance - agent sells to company)
 */
const agentTransactionSchema = new Schema({
  // Agent Information
  agentId: {
    type: Schema.Types.ObjectId,
    ref: "user",
    required: true,
    index: true
  },

  agentName: {
    type: String,
    required: true
  },

  // Transaction Type
  transactionType: {
    type: String,
    enum: ["credit", "debit"],
    required: true,
    index: true,
    comment: "credit = Company owes agent (from_agent), debit = Agent owes company (to_agent)"
  },

  // Amount
  amount: {
    type: Number,
    required: true,
    min: 0
  },

  // Description
  description: {
    type: String,
    required: true
  },

  // Reference to Insurance
  insuranceId: {
    type: Schema.Types.ObjectId,
    index: true
  },

  // Reference to Customer
  insuredId: {
    type: Schema.Types.ObjectId,
    ref: "Insured",
    index: true
  },

  insuredName: {
    type: String
  },

  // Reference to Vehicle
  vehicleId: {
    type: Schema.Types.ObjectId
  },

  vehiclePlateNumber: {
    type: String
  },

  // Insurance Details (for reference)
  insuranceType: {
    type: String
  },

  insuranceCompany: {
    type: String
  },

  insuranceTotalAmount: {
    type: Number,
    comment: "Total insurance value for reference"
  },

  // Transaction Status
  status: {
    type: String,
    enum: ["pending", "settled", "cancelled"],
    default: "pending",
    index: true
  },

  // Date Information
  transactionDate: {
    type: Date,
    default: Date.now,
    index: true
  },

  settledDate: {
    type: Date
  },

  // Notes
  notes: {
    type: String,
    maxlength: 1000
  },

  // Who recorded this transaction
  recordedBy: {
    type: Schema.Types.ObjectId,
    ref: "user"
  }

}, {
  timestamps: true
});

// Indexes for efficient queries
agentTransactionSchema.index({ agentId: 1, status: 1 });
agentTransactionSchema.index({ agentId: 1, transactionType: 1 });
agentTransactionSchema.index({ transactionDate: -1 });
agentTransactionSchema.index({ agentId: 1, transactionDate: -1 });
agentTransactionSchema.index({ status: 1, transactionDate: -1 });

const AgentTransactionModel = mongoose.model("AgentTransaction", agentTransactionSchema);

export default AgentTransactionModel;
