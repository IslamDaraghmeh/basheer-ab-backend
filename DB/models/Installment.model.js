import mongoose from "mongoose";

const installmentSchema = new mongoose.Schema({
  insuredId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Insured",
    required: true,
  },
  insuranceItems: [
    {
      insuranceId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
      },
      insuranceType: {
        type: String,
        enum: ["general", "vehicle"],
        required: true,
      },
      insuranceCompany: {
        type: String, 
        required: true,
      },
      insuranceCategory: {
        type: String, 
      }
    }
  ],
  totalAmount: {
    type: Number,
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  numberOfInstallments: {
    type: Number,
    required: true,
  },
  frequency: {
    type: String,
    enum: ["monthly", "yearly"],
    required: true,
  },
  installments: [
    {
      dueDate: { type: Date, required: true },
      amount: { type: Number, required: true },
      isPaid: { type: Boolean, default: false },
      paidDate: { type: Date },
      paymentMethod: {
        type: String,
        enum: ["cash", "visa", "check", "bank"],
      },
      notes: { type: String },
    }
  ],
  note: { type: String },
}, { timestamps: true });

const InstallmentModel = mongoose.model("Installment", installmentSchema);
export default InstallmentModel;
