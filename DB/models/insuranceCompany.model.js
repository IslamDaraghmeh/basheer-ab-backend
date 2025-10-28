import mongoose from "mongoose";

const insuranceCompanySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  description: {
    type: String,
    default: "",
    trim: true
  },
  insuranceTypes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InsuranceType'
  }],
  roadServices: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RoadService'
  }]
}, { timestamps: true });

const InsuranceCompany = mongoose.model("InsuranceCompany", insuranceCompanySchema);

export default InsuranceCompany;
