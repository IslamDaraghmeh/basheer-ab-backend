import mongoose, { Schema } from "mongoose";

const chequeSchema = new Schema(
  {
    chequeNumber: {
      type: String,
      required: true,
      trim: true,
      index: true
    },

    customer: {
      insuredId: {
        type: Schema.Types.ObjectId,
        ref: "Insured",
        required: true,
        index: true
      },
      name: { type: String, required: true },
      idNumber: { type: String, required: true },
      phoneNumber: { type: String }
    },

    chequeDate: {
      type: Date,
      required: true,
      index: true
    },

    amount: {
      type: Number,
      required: true,
      min: 0
    },

    status: {
      type: String,
      enum: ["pending", "cleared", "returned", "cancelled"],
      default: "pending",
      required: true,
      index: true
    },

    chequeImage: {
      type: String,
      default: null
    },

    notes: {
      type: String,
      default: "",
      maxlength: 500
    },

    // Optional: Link to insurance payment if cheque is for insurance
    insuranceId: {
      type: Schema.Types.ObjectId,
      default: null,
      index: true
    },

    vehicleId: {
      type: Schema.Types.ObjectId,
      default: null
    },

    // Additional metadata
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true
    },

    returnedDate: {
      type: Date,
      default: null
    },

    returnedReason: {
      type: String,
      default: null
    },

    clearedDate: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Indexes for better query performance
chequeSchema.index({ chequeNumber: 1, "customer.insuredId": 1 });
chequeSchema.index({ status: 1, chequeDate: 1 });
chequeSchema.index({ "customer.insuredId": 1, status: 1 });

const ChequeModel = mongoose.model("Cheque", chequeSchema);

export default ChequeModel;
