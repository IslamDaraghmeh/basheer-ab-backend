
import mongoose, { Schema } from "mongoose";


// Payment subdocument schema for multi-method payments
const paymentSchema = new mongoose.Schema({
  paymentDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentMethod: {
    type: String,
    enum: ["cash", "card", "cheque", "bank_transfer"],
    required: true
  },
  receiptNumber: {
    type: String
  },
  notes: {
    type: String,
    maxlength: 500
  },
  chequeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Cheque"
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user"
  }
}, { timestamps: true });

const vehicleInsuranceSchema = new mongoose.Schema({
  insuranceStartDate: { type: Date },
  insuranceEndDate: { type: Date },
  isUnder24: { type: Boolean, required: true },

  insuranceCategory: {
    type: String,
    required: true,
    enum: ["vehicle_insurance"]
  },

  insuranceType: {
    type: String,
    required: true,
    trim: true
  },

  insuranceCompany: { type: String, required: true },
  agent: { type: String },
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user"
  },

  // Agent Flow: "to_agent" (agent sells to company) or "from_agent" (company sells via agent)
  agentFlow: {
    type: String,
    enum: ["to_agent", "from_agent", "none"],
    default: "none",
    comment: "to_agent = Agent owes company, from_agent = Company owes agent"
  },

  // Amount issued from/to agent
  agentAmount: {
    type: Number,
    default: 0,
    comment: "Amount credited to agent if from_agent, or amount agent owes if to_agent"
  },

  // Total insurance value
  insuranceAmount: {
    type: Number,
    required: true,
    comment: "Total value of insurance policy"
  },

  // Multi-method payments array
  payments: [paymentSchema],

  // Auto-calculated from payments array
  paidAmount: {
    type: Number,
    default: 0,
    comment: "Auto-calculated: sum of all payments"
  },

  remainingDebt: {
    type: Number,
    default: 0,
    comment: "Auto-calculated: insuranceAmount - paidAmount"
  },

  insuranceStatus: { type: String, default: "active" },
  refundAmount: { type: Number, default: 0 },
  insuranceFiles: [{ type: String }],

  // Reference to separate Cheque documents
  cheques: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Cheque"
  }]
});


vehicleInsuranceSchema.pre("save", function (next) {
  // Auto-calculate paidAmount from payments array
  if (this.payments && this.payments.length > 0) {
    this.paidAmount = this.payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
  }

  // Auto-calculate remainingDebt
  this.remainingDebt = this.insuranceAmount - this.paidAmount;

  next();
});



const vehicleSchema = new mongoose.Schema({
  plateNumber: { type: String, required: true, trim: true },
  model: { type: String, required: true },
  type: { type: String, required: true },
  ownership: { type: String, required: true },
  modelNumber: { type: String, required: true },
  licenseExpiry: { type: Date, required: true },
  lastTest: { type: Date, required: true },
  color: { type: String, required: true },
  price: { type: Number, required: true },
  image: {
    type: String,
    default: "https://www.bing.com/images/search?view=detailV2&ccid=eUdZe6jP&id=4FC8766F458838654929A06B2EC9D65088D0A1C8&thid=OIP.eUdZe6jPSNXtNAbxcswuIgHaE8"
  },
  insurance: [vehicleInsuranceSchema]
});



const insuredSchema = new mongoose.Schema({
  image: { type: String, default: "https://www.bing.com/images/search?view=detailV2&ccid=eUdZe6jP&id=4FC8766F458838654929A06B2EC9D65088D0A1C8&thid=OIP.eUdZe6jPSNXtNAbxcswuIgHaE8" },
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  id_Number: { type: String, required: true, trim: true },
  phone_number: { type: String, required: true },
  joining_date: { type: Date, default: Date.now },
  notes: { type: String },
  city: { type: String, required: true },
  email: { type: String, required: true },
  birth_date: { type: Date, required: true },
  agentsId: { type: Schema.Types.ObjectId, ref: "user" },
  agentsName: { type: String },

  attachments: [{
    fileName: { type: String },
    fileUrl: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now }
  }],
  vehicles: [vehicleSchema]
}, { timestamps: true });

// Database indexes for performance optimization
insuredSchema.index({ id_Number: 1 }, { unique: true });
insuredSchema.index({ phone_number: 1 });
insuredSchema.index({ email: 1 });
insuredSchema.index({ agentsName: 1 });
insuredSchema.index({ joining_date: -1 });
insuredSchema.index({ 'vehicles.plateNumber': 1 });
insuredSchema.index({ 'vehicles.insurance.insuranceEndDate': 1 });
insuredSchema.index({ 'vehicles.insurance.insuranceCompany': 1 });
insuredSchema.index({ 'vehicles.insurance.agent': 1 });



const insuredModel = mongoose.model("Insured", insuredSchema);

export { insuredModel };


