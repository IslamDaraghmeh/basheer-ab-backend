import mongoose, { Schema } from "mongoose";


const insurancePolicySchema = new Schema({
  type: String,
  number: String,
  duration: String,
  from: Date,
  to: Date
}, { _id: false });


const vehicleSchema = new Schema({
  registrationNumber: String,
  usage: String,
  type: String,
  makeYear: String,
  color: String
}, { _id: false });


const otherVehicleSchema = new Schema({
  vehicleNumber: String,
  type: String,
  makeYear: String,
  color: String,
  ownerName: String,
  ownerAddress: String,
  driverName: String,
  driverAddress: String,
  insuranceCompany: String,
  insurancePolicyNumber: String,
  wasParked: Boolean,
  damageDescription: String
}, { _id: false });


const personalInjurySchema = new Schema({
  name: String,
  age: Number,
  job: String,
  address: String,
  injuryType: String
}, { _id: false });


const AlMashreqAccidentReportSchema = new Schema({
  insuredId: { type: mongoose.Schema.Types.ObjectId, ref: "Insured", required: true },
  branchOffice: String,
  insurancePolicy: insurancePolicySchema,
  insuredPerson: {
    name: String,
    personalNumber: String,
    fullAddress: String,
    phone: String
  },
  vehicle: vehicleSchema,
  driver: {
    name: String,
    job: String,
    fullAddress: String,
    phone: String,
    licenseNumber: String,
    licenseType: String,
    licenseIssueDate: Date,
    licenseExpiryDate: Date,
    age: Number,
    idNumber: String
  },
  accident: {
    date: Date,
    time: String,
    weatherCondition: String,
    roadCondition: String,
    accidentLocation: String,
    accidentType: String,
    damageToVehicle: String,
    vehicleSpeed: String,
    timeOfAccident: String,
    passengersCount: Number,
    vehicleUsedPermission: Boolean,
    accidentNotifierName: String,
    accidentNotifierPhone: String
  },
  otherVehicles: [otherVehicleSchema],
  vehicleDamages: String,

  // ✅ updated to array of objects
  personalInjuries: [personalInjurySchema],

  thirdPartyInjuredNames: [String],
  vehiclePassengers: [String],
  externalWitnesses: [String],
  driverSignature: {
    name: String,
    date: Date
  },
  claimant: {
    name: String,
    signature: String
  },
  receiver: {
    name: String,
    notes: String
  },
  generalNotes: String
}, {
  timestamps: true
});


const AlMashreqAccidentReportModel = mongoose.model(
  "AlMashreqAccidentReport",
  AlMashreqAccidentReportSchema
);

export default AlMashreqAccidentReportModel;
