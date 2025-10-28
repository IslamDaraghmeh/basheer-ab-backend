import mongoose, { Schema } from "mongoose";

const licenseSchema = new Schema({
  number: String,
  type: String,
  issueDate: Date,
  expiryDate: Date,
}, { _id: false });

const driverInfoSchema = new Schema({
  name: String,
  idNumber: String,
  age: Number,
  occupation: String,
  license: { type: licenseSchema },
  address: String,
}, { _id: false });

const agentInfoSchema = new Schema({
  agentName: String,
  documentNumber: String,
  documentType: { type: String, enum: ['comprehensive', 'third_party'] },
  insurancePeriod: {
    from: Date,
    to: Date,
  },
}, { _id: false });

const vehicleInfoSchema = new Schema({
  documentDate: Date,
  vehicleNumber: String,
  vehicleType: String,
  make: String,
  modelYear: String,
  usage: String,
  color: String,
  ownerName: String,
  ownerID: String,
  registrationExpiry: Date,
}, { _id: false });

const accidentDetailsSchema = new Schema({
  accidentDate: Date,
  time: String,
  location: String,
  numberOfPassengers: Number,
  vehicleSpeed: Number,
  vehiclePurposeAtTime: String,
  accidentDescription: String,
  responsibleParty: String,
  policeInformed: { type: Boolean, default: false },
  policeStation: String,
}, { _id: false });

const thirdPartySchema = new Schema({
  vehicleNumber: String,
  vehicleType: String,
  make: String,
  model: String,
  color: String,
  ownerName: String,
  ownerPhone: String,
  ownerAddress: String,
  driverName: String,
  driverPhone: String,
  driverAddress: String,
  insuranceCompany: String,
  insurancePolicyNumber: String,
  vehicleDamages: String,
}, { _id: false });

const injurySchema = new Schema({
  name: String,
  age: Number,
  occupation: String,
  address: String,
  injuryType: String,
}, { _id: false });

const witnessSchema = new Schema({
  name: String,
  address: String,
  statementGiven: Boolean,
}, { _id: false });

const passengerSchema = new Schema({
  name: String,
}, { _id: false });

const additionalDetailsSchema = new Schema({
  notes: String,
  signature: String,
  date: Date,
  agentRemarks: String,
}, { _id: false });

const accidentPalestineReportSchema = new Schema({
  insuredId: {
    type: Schema.Types.ObjectId,
    ref: "Insured",
    required: true,
  },
  agentInfo: agentInfoSchema,
  vehicleInfo: vehicleInfoSchema,
  driverInfo: driverInfoSchema,
  accidentDetails: accidentDetailsSchema,
  thirdParty: thirdPartySchema,
  injuries: [injurySchema],
  witnesses: [witnessSchema],
  passengers: [passengerSchema],
  additionalDetails: additionalDetailsSchema,
});

const PalestineAccidentReportModel =
  mongoose.models.AccidentReportPalestine ||
  mongoose.model("AccidentReportPalestine", accidentPalestineReportSchema);

export default PalestineAccidentReportModel;
