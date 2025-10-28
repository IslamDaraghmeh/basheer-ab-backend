import mongoose, { Schema } from "mongoose";

const pricingTypeSchema = new Schema(
  {
    _id: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ""
    },
    requiresPricingTable: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    _id: false // We're using custom string IDs
  }
);

const PricingTypeModel = mongoose.model("PricingType", pricingTypeSchema);

export default PricingTypeModel;
