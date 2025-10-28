import mongoose, { Schema } from "mongoose";
const TakafulAccidentReportSchema = new Schema({
  insuredId: { 
    type: Schema.Types.ObjectId, 
    ref: "Insured", 
    required: true 
  },
  
  accidentInfo: {
    reportDate: { type: Date, required: true },
    accidentDate: { type: Date, required: true },
    accidentType: { type: String, required: true },
    accidentLocation: { type: String, required: true },
    accidentTime: { type: String, required: true },
    passengersCount: { type: Number, required: true },
    agentName: { type: String, required: true },
  },

  policyInfo: {
    policyNumber: { type: String, required: true },
    branch: { type: String, required: true },
    durationFrom: { type: Date, required: true },
    durationTo: { type: Date, required: true },
    issueDate: { type: Date, required: true },
    isFullCoverage: { type: Boolean, required: true },
    fullCoverageFee: { type: String, required: true },
    isThirdParty: { type: Boolean, required: true },
    thirdPartyFee: { type: String, required: true },
    isMandatory: { type: Boolean, required: true },
    maxAllowedPassengers: { type: Number, required: true },
  },

  insuredPerson: {
    name: { type: String, required: true },
    address: { type: String, required: true },
    residence: { type: String, required: true },
    workAddress: { type: String, required: true },
    workPhone: { type: String, required: true },
  },

  driverInfo: {
    name: { type: String, required: true },
    idNumber: { type: String, required: true },
    birthDate: { type: Date, required: true },
    age: { type: Number, required: true },
    residence: { type: String, required: true },
    address: { type: String, required: true },
    workAddress: { type: String, required: true },
    workPhone: { type: String, required: true },
    relationToInsured: { type: String, required: true },
  },

  licenseInfo: {
    licenseNumber: { type: String, required: true },
    licenseType: { type: String, required: true },
    issueDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true },
    matchesVehicleType: { type: Boolean, required: true },
  },

  insuredVehicle: { 
    plateNumber: { type: Number, required: true },
    model: { type: String, required: true },
    type: { type: String, required: true },
    ownership: { type: String, required: true },
    modelNumber: { type: String, required: true },
    licenseExpiry: { type: Date, required: true },
    lastTest: { type: Date, required: true },
    color: { type: String, required: true },
    price: { type: Number, required: true },
    damage: {
      front: { type: String, required: true },
      back: { type: String, required: true },
      left: { type: String, required: true },
      right: { type: String, required: true },
      estimatedValue: { type: String, required: true },
      towingCompany: { type: String, required: true },
      garage: { type: String, required: true },
    },
  },

  otherVehicles: [
    {
      vehicleNumber: { type: String, required: true },
      ownerName: { type: String, required: true },
      driverName: { type: String, required: true },
      colorAndType: { type: String, required: true },
      totalWeight: { type: String, required: true },
      address: { type: String, required: true },
      phone: { type: String, required: true },
      insuranceCompany: { type: String, required: true },
      policyNumber: { type: String, required: true },
      insuranceType: { type: String, required: true },
      damageDescription: { type: String, required: true },
    }
  ],

  policeAndWitnesses: {
    reportedDate: { type: Date, required: true },
    policeAuthority: { type: String, required: true },
    sketchDrawn: { type: Boolean, required: true },
    policeCame: { type: Boolean, required: true },
    witnesses: [
      {
        name: { type: String, required: true },
        phone: { type: String, required: true },
        address: { type: String, required: true },
      }
    ],
  },

  passengers: [
    {
      name: { type: String, required: true },
      age: { type: Number, required: true },
      address: { type: String, required: true },
      hospital: { type: String, required: true },
      injuryDescription: { type: String, required: true },
    }
  ],

  accidentNarration: { type: String, required: true },
  notifierSignature: { type: String, required: true },
  receiverName: { type: String, required: true },
  receiverNotes: { type: String, required: true },

  declaration: {
    declarerName: { type: String, required: true },
    declarationDate: { type: Date, required: true },
    documentCheckerName: { type: String, required: true },
    checkerJob: { type: String, required: true },
    checkerSignature: { type: String, required: true },
    checkerDate: { type: Date, required: true },
  },
});


const TakafulAccidentReportModel = mongoose.model("TakafulAccidentReport", TakafulAccidentReportSchema);

export  default TakafulAccidentReportModel ;
