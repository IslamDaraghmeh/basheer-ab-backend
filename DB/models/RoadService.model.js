import mongoose from "mongoose";

/**
 * RoadService Model
 *
 * Manages road services for insurance companies
 * Each service has different pricing for normal and old cars
 */

const roadServiceSchema = new mongoose.Schema({
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "InsuranceCompany",
    required: true,
    index: true
  },

  service_name: {
    type: String,
    required: true,
    trim: true
  },

  normal_price: {
    type: Number,
    required: true,
    min: [0, "Normal price must be >= 0"]
  },

  old_car_price: {
    type: Number,
    required: true,
    min: [0, "Old car price must be >= 0"]
  },

  cutoff_year: {
    type: Number,
    required: true,
    default: 2007,
    min: [1900, "Cutoff year must be valid"]
  },

  description: {
    type: String,
    default: "",
    trim: true
  },

  is_active: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Compound index to ensure unique service per company
roadServiceSchema.index({ company_id: 1, service_name: 1 }, { unique: true });

export const RoadServiceModel = mongoose.model("RoadService", roadServiceSchema);
