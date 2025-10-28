import mongoose from "mongoose";

const insuranceTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  pricing_type_id: {
    type: String,
    ref: "PricingType",
    required: true,
    enum: ["compulsory", "third_party", "comprehensive", "road_service", "accident_fee_waiver"]
  },
  description: {
    type: String,
    default: "",
    trim: true
  }
}, { timestamps: true });

export const InsuranceTypeModel = mongoose.model("InsuranceType", insuranceTypeSchema);
