
import mongoose, { Schema } from "mongoose";

const revenueSchema = new Schema({
  title: { type: String, required: true },
  amount: { type: Number, required: true },
  receivedFrom: { type: String, required: true },
  paymentMethod: {
    type: String,
    enum: ["cash", "card", "check", "bank_transfer"],
    default: "cash"
  },
  date: { type: Date, default: Date.now },
  description: { type: String },
  fromVehiclePlate: { type: String },
  toVehiclePlate: { type: String }     
}, { timestamps: true });

export const RevenueModel = mongoose.model("Revenue", revenueSchema);
